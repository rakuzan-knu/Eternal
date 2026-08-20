import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentModal } from '../CommentModal';
import { useUIStore } from '@/shared/model/useUIStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { commentsApi } from '../../api/commentsApi';
import type { PostType } from '@/entities/post/model/types';

vi.mock('../../api/commentsApi', () => ({
  commentsApi: {
    getComments: vi.fn(),
    getReplies: vi.fn(),
    addComment: vi.fn(),
    toggleLike: vi.fn(),
    togglePin: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

describe('CommentModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    (commentsApi.getComments as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      comments: [
        {
          id: 'c-1',
          text: 'Great post!',
          time: '1h',
          handle: 'janedoe',
          author: 'Jane',
          userId: 'usr-jane',
          likesCount: 2,
          isLiked: false,
          replyCount: 1,
          isPinned: false,
          isDeleted: false,
        },
      ],
      nextCursor: null,
    });

    useUIStore.setState({
      isCommentModalOpen: true,
      activePostForComments: {
        id: 'post-123',
        author: 'John Doe',
        handle: 'johndoe',
        authorId: 'usr-1',
        text: 'This is my awesome post!',
        createdAt: new Date().toISOString(),
        commentsCount: 1,
      } as unknown as PostType,
    });
  });

  it('renders active post content and fetched comments', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText('This is my awesome post!').length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(screen.getByText('Great post!')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const closeBtn = screen.getAllByTitle(/Close/i)[0];
    fireEvent.click(closeBtn);

    expect(useUIStore.getState().isCommentModalOpen).toBe(false);
  });

  it('submits a new root comment through the composer', async () => {
    (commentsApi.addComment as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'c-new',
      text: 'Awesome commentary!',
      time: 'just now',
      handle: 'johndoe',
      author: 'John Doe',
      userId: 'usr-1',
      likesCount: 0,
      isLiked: false,
      replyCount: 0,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const textarea = screen.getByPlaceholderText(/Comment as @/i);
    fireEvent.change(textarea, { target: { value: 'Awesome commentary!' } });

    const submitBtn = screen.getByTitle('Send comment');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(commentsApi.addComment).toHaveBeenCalledWith(
        'post-123',
        'Awesome commentary!',
        undefined,
        undefined,
        undefined,
        expect.any(String),
      );
    });
  });

  it('submits a reply passing parentId and target userId', async () => {
    (commentsApi.addComment as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'c-reply-1',
      text: '@janedoe Nice!',
      time: 'just now',
      handle: 'johndoe',
      author: 'John Doe',
      userId: 'usr-1',
      parentId: 'c-1',
      replyToUserId: 'usr-jane',
      likesCount: 0,
      isLiked: false,
      replyCount: 0,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Great post!')).toBeInTheDocument();
    });

    const replyBtn = screen.getByText('Reply');
    fireEvent.click(replyBtn);

    const textarea = screen.getByPlaceholderText(/Reply to @janedoe.../i);
    fireEvent.change(textarea, { target: { value: '@janedoe Nice!' } });

    const submitBtn = screen.getByTitle('Send comment');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(commentsApi.addComment).toHaveBeenCalledWith(
        'post-123',
        '@janedoe Nice!',
        'c-1',
        undefined,
        'usr-jane',
        expect.any(String),
      );
    });
  });

  it('renders error state and allows retry when getComments fails', async () => {
    (commentsApi.getComments as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Internal server error'),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
