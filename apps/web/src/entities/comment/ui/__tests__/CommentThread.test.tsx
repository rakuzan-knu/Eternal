import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentThread } from '../CommentThread';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { commentsApi } from '../../api/commentsApi';
import type { CommentType } from '../../model/types';

vi.mock('../../api/commentsApi', () => ({
  commentsApi: {
    getReplies: vi.fn(),
  },
}));

describe('CommentThread', () => {
  let queryClient: QueryClient;

  const mockRootComment: CommentType = {
    id: 'c-root',
    text: 'Root comment here',
    time: '3h',
    handle: 'sam',
    author: 'Sam',
    userId: 'usr-sam',
    replyCount: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    (commentsApi.getReplies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      comments: [
        {
          id: 'c-reply-1',
          text: 'First nested reply',
          time: '1h',
          handle: 'lisa',
          author: 'Lisa',
          userId: 'usr-lisa',
          parentId: 'c-root',
          rootParentId: 'c-root',
        },
      ],
      nextCursor: null,
    });
  });

  it('renders root comment and View 2 replies toggle button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentThread comment={mockRootComment} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Root comment here')).toBeInTheDocument();
    expect(screen.getByText(/View 2 replies/i)).toBeInTheDocument();
  });

  it('renders View 1 reply when replyCount is 1', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentThread comment={{ ...mockRootComment, replyCount: 1 }} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('View 1 reply')).toBeInTheDocument();
  });

  it('does not render replies toggle if replyCount is 0', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentThread comment={{ ...mockRootComment, replyCount: 0 }} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByText(/View \d+ repl/i)).not.toBeInTheDocument();
  });

  it('expands replies list when toggle is clicked and supports collapsing', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentThread comment={mockRootComment} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const toggleBtn = screen.getByText(/View 2 replies/i);
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText('First nested reply')).toBeInTheDocument();
    });

    expect(screen.getByText('Hide replies')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hide replies'));
    expect(screen.queryByText('First nested reply')).not.toBeInTheDocument();
  });

  it('supports autoExpand and pagination with nextCursor', async () => {
    (commentsApi.getReplies as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        comments: [
          {
            id: 'c-reply-1',
            text: 'First nested reply',
            time: '1h',
            handle: 'lisa',
            author: 'Lisa',
            userId: 'usr-lisa',
          },
        ],
        nextCursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        comments: [
          {
            id: 'c-reply-2',
            text: 'Second nested reply',
            time: '30m',
            handle: 'bob',
            author: 'Bob',
            userId: 'usr-bob',
          },
        ],
        nextCursor: null,
      });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentThread comment={mockRootComment} autoExpand={true} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('First nested reply')).toBeInTheDocument();
    });

    const loadMoreBtn = screen.getByText('View more replies');
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText('Second nested reply')).toBeInTheDocument();
    });
  });

  it('handles replyCount undefined when replies exist and loading state', async () => {
    (commentsApi.getReplies as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentThread comment={{ ...mockRootComment, replyCount: 2 }} autoExpand={true} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Loading replies...')).toBeInTheDocument();
  });

  it('renders Loading more... when isFetchingNextPage is true and handles undefined replyCount', async () => {
    let resolveNextPage: (val: any) => void;
    const pendingNextPagePromise = new Promise((resolve) => {
      resolveNextPage = resolve;
    });

    (commentsApi.getReplies as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        comments: [
          {
            id: 'c-reply-1',
            text: 'First nested reply',
            time: '1h',
            handle: 'lisa',
            author: 'Lisa',
            userId: 'usr-lisa',
          },
        ],
        nextCursor: 'cursor-2',
      })
      .mockImplementationOnce(() => pendingNextPagePromise);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentThread
            comment={{ ...mockRootComment, replyCount: undefined }}
            autoExpand={true}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('First nested reply')).toBeInTheDocument();
    });

    const loadMoreBtn = screen.getByText('View more replies');
    fireEvent.click(loadMoreBtn);

    expect(await screen.findByText('Loading more...')).toBeInTheDocument();

    resolveNextPage!({
      comments: [
        {
          id: 'c-reply-2',
          text: 'Second reply',
          time: '5m',
          handle: 'sam',
          author: 'Sam',
          userId: 'usr-sam',
        },
      ],
      nextCursor: null,
    });

    await waitFor(() => {
      expect(screen.getByText('Second reply')).toBeInTheDocument();
    });
  });
});
