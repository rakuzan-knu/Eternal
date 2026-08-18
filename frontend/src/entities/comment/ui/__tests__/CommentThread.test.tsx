import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentThread } from '../CommentThread';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { commentsApi } from '@/features/comment/api/commentsApi';
import type { CommentType } from '../../model/types';

vi.mock('@/features/comment/api/commentsApi', () => ({
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

  it('expands replies list when toggle is clicked', async () => {
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
  });
});
