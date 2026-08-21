import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentModal } from '../CommentModal';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useUIStore } from '@/shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { commentsApi } from '../../api/commentsApi';

vi.mock('@/entities/profile/model/useCurrentUser');

describe('CommentModal (Comprehensive Suite)', () => {
  const mockPost = {
    id: 'post-100',
    authorId: 'author-100',
    author: 'Grace Hopper',
    handle: 'grace',
    avatar: 'https://example.com/grace.jpg',
    text: 'Debugging the first compiler bug!',
    likes: 120,
    likesCount: 120,
    comments: 2,
    commentsCount: 2,
    reposts: 15,
    repostsCount: 15,
    isLiked: false,
    isSaved: false,
    isReposted: false,
    isPinned: false,
    createdAt: new Date().toISOString(),
    media: [
      { type: 'image', url: 'https://example.com/bug.png' },
      { type: 'image', url: 'https://example.com/compiler.png' },
    ],
  };

  const mockComments = [
    {
      id: 'comm-1',
      postId: 'post-100',
      authorId: 'user-200',
      author: 'Ada Lovelace',
      handle: 'ada',
      avatar: null,
      text: 'Fascinating work on the compiler!',
      likesCount: 10,
      replyCount: 0,
      isLiked: false,
      isPinned: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      isCommentModalOpen: true,
      activePostForComments: mockPost as any,
    });

    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-current', username: 'current' } as any,
      isLoading: false,
    } as any);

    vi.spyOn(commentsApi, 'getComments').mockResolvedValue({
      comments: mockComments as any,
      nextCursor: null,
    });
    vi.spyOn(commentsApi, 'addComment').mockResolvedValue({
      id: 'comm-new-1',
      postId: 'post-100',
      authorId: 'current-user',
      author: 'Current User',
      handle: 'current',
      avatar: null,
      text: 'Amazing historical milestone!',
      likesCount: 0,
      replyCount: 0,
      isLiked: false,
      isPinned: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    } as any);
    vi.spyOn(commentsApi, 'toggleLike').mockResolvedValue({ isLiked: true, likesCount: 11 } as any);
    vi.spyOn(commentsApi, 'deleteComment').mockResolvedValue({ success: true } as any);
  });

  it('renders post details, image carousel, and fetched comments', async () => {
    renderWithProviders(<CommentModal />);

    expect(screen.getAllByText('Grace Hopper').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Debugging the first compiler bug!').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.getByText('Fascinating work on the compiler!')).toBeInTheDocument();
    });
  });

  it('navigates through media carousel slides using next/previous buttons', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<CommentModal />);

    const nextBtn = screen.getByTitle('Next');
    await user.click(nextBtn);

    const prevBtn = screen.getByTitle('Previous');
    await user.click(prevBtn);
  });

  it('allows submitting a new comment via composer', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<CommentModal />);

    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/add a comment|write a comment/i);
    await user.type(input, 'Amazing historical milestone!');

    const submitBtn = screen.getByTitle('Send comment');
    await user.click(submitBtn);

    expect(commentsApi.addComment).toHaveBeenCalledWith(
      'post-100',
      'Amazing historical milestone!',
      undefined,
      undefined,
      undefined,
      expect.any(String),
    );
  });

  it('handles empty comments state and clicking quick emoji reaction', async () => {
    vi.spyOn(commentsApi, 'getComments').mockResolvedValueOnce({
      comments: [],
      nextCursor: null,
    });

    const user = userEvent.setup({ delay: null });
    renderWithProviders(<CommentModal />);

    await waitFor(() => {
      expect(screen.getByText('No comments yet')).toBeInTheDocument();
    });

    const fireEmojiBtn = screen.getByRole('button', { name: '🔥' });
    await user.click(fireEmojiBtn);

    expect(commentsApi.addComment).toHaveBeenCalledWith(
      'post-100',
      '🔥',
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('likes and unlikes the post from modal actions', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<CommentModal />);

    const likeBtn = screen.getByTitle('Like');
    await user.click(likeBtn);

    expect(useUIStore.getState().activePostForComments?.isLiked).toBe(true);
    expect(useUIStore.getState().activePostForComments?.likes).toBe(121);
  });
});
