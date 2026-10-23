import { chatApi } from '@/entities/chat';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PostCard } from '../PostCard';
import { useUIStore } from '@/shared/model/useUIStore';
import type { PostType } from '@/entities/post/model/types';
import { resetUIStore } from '@/test/resetUIStore';
import * as useLikeMutationModule from '@/features/posts/model/useLikeMutation';
import * as useRepostMutationModule from '@/features/posts/model/useRepostMutation';
import * as useSavePostMutationModule from '@/features/posts/model/useSavePostMutation';
import * as useDeletePostMutationModule from '@/features/posts/model/useDeletePostMutation';
import * as usePinPostMutationModule from '@/features/posts/model/usePinPostMutation';
import * as useEditPostMutationModule from '@/features/posts/model/useEditPostMutation';

vi.mock('@/entities/post/ui/PostMedia', () => ({
  PostMedia: ({ media }: { media: { url: string }[] }) =>
    media.length > 0 ? <img alt="Post Attachment" src={media[0].url} /> : null,
}));

vi.mock('@/shared/lib/formatRelativeTime', () => ({
  formatRelativeTime: () => '3h',
}));

vi.mock('@/features/posts/ui/PollDisplay', () => ({
  PollDisplay: () => <div data-testid="poll-display">PollDisplay</div>,
}));

vi.mock('@/entities/post/ui/PollVotersModal', () => ({
  PollVotersModal: ({ onClose }: any) => (
    <div data-testid="voters-modal">
      <button onClick={onClose}>Close Voters</button>
    </div>
  ),
}));

const basePost: PostType = {
  id: 1,
  authorId: 'author-1',
  author: 'Ayate',
  handle: 'ayate',
  avatar: '💀',
  text: 'Hello world',
  createdAt: '2026-07-15T09:00:00.000Z',
  editedAt: '2026-07-15T10:00:00.000Z',
  comments: 2,
  reposts: 1,
  likes: 5,
  sharesCount: 3,
};

describe('PostCard', () => {
  const mockLikeMutate = vi.fn();
  const mockRepostMutate = vi.fn();
  const mockSaveMutate = vi.fn();
  const mockDeleteMutate = vi.fn();
  const mockPinMutate = vi.fn();
  const mockEditMutate = vi.fn();

  beforeEach(() => {
    vi.spyOn(useLikeMutationModule, 'useLikeMutation').mockReturnValue({
      mutate: mockLikeMutate,
      isPending: false,
    } as any);

    vi.spyOn(useRepostMutationModule, 'useRepostMutation').mockReturnValue({
      mutate: mockRepostMutate,
      isPending: false,
    } as any);

    vi.spyOn(useSavePostMutationModule, 'useSavePostMutation').mockReturnValue({
      mutate: mockSaveMutate,
      isPending: false,
    } as any);

    vi.spyOn(useDeletePostMutationModule, 'useDeletePostMutation').mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    } as any);

    vi.spyOn(usePinPostMutationModule, 'usePinPostMutation').mockReturnValue({
      mutate: mockPinMutate,
      isPending: false,
    } as any);

    vi.spyOn(useEditPostMutationModule, 'useEditPostMutation').mockReturnValue({
      mutate: mockEditMutate,
      isPending: false,
    } as any);
  });

  afterEach(() => {
    resetUIStore();
    vi.clearAllMocks();
  });

  function renderPostCard(post: PostType = basePost, isVirtualized = false) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PostCard post={post} queryKey={['test']} isVirtualized={isVirtualized} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('renders author, handle, time, edited badge, text and counters', () => {
    renderPostCard();

    expect(screen.getByText('Ayate')).toBeInTheDocument();
    expect(screen.getByText('@ayate • 3h')).toBeInTheDocument();
    expect(screen.getByText('(edited)')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('exposes real geometry when the virtual list owns visibility', () => {
    const { container } = renderPostCard(basePost, true);
    const card = container.querySelector<HTMLElement>(`#post-${basePost.id}`)!;
    expect(card.style.contentVisibility).toBe('visible');
    expect(card.style.containIntrinsicSize).toBe('');
    expect(card.style.contain).toBe('layout style paint');
  });

  it('places Like first in both visual and keyboard action order', () => {
    renderPostCard();
    const like = screen.getByTitle('Like');
    const row = like.parentElement;
    expect(row?.querySelector('button')).toBe(like);
    expect(row?.querySelectorAll('button')[1]).toHaveAccessibleName('View comments');
  });

  it('does not render the repost banner for a regular post', () => {
    renderPostCard();

    expect(screen.queryByText(/reposted|You reposted/i)).not.toBeInTheDocument();
  });

  it('renders the repost banner with the reposter name for a repost', () => {
    const repost: PostType = { ...basePost, type: 'repost', repostedBy: 'Kolya' };

    renderPostCard(repost);

    expect(screen.getByText('Kolya')).toBeInTheDocument();
  });

  it('renders the attached image when post.image is provided', () => {
    const postWithImage: PostType = { ...basePost, image: 'https://example.com/pic.png' };

    renderPostCard(postWithImage);

    expect(screen.getByAltText('Post Attachment')).toHaveAttribute(
      'src',
      'https://example.com/pic.png',
    );
  });

  it('renders pinned badge when post.isPinned is true', () => {
    renderPostCard({ ...basePost, isPinned: true });
    expect(screen.getByText('Pinned post')).toBeInTheDocument();
  });

  it('handles like, repost, and save clicks', async () => {
    const user = userEvent.setup();
    renderPostCard();

    const likeButton = screen.getByTitle('Like');
    await user.click(likeButton);
    expect(mockLikeMutate).toHaveBeenCalled();

    const repostButton = screen.getByTitle('Repost');
    await user.click(repostButton);
    expect(mockRepostMutate).toHaveBeenCalled();

    const saveButton = screen.getByTitle('Save post (Hold for collections)');
    await user.click(saveButton);
    expect(mockSaveMutate).toHaveBeenCalled();
  });

  it('opens share modal on share click', async () => {
    const user = userEvent.setup();
    renderPostCard();

    const shareButton = screen.getByTitle('Share post');
    await user.click(shareButton);

    expect(useUIStore.getState().isShareModalOpen).toBe(true);
  });

  it('renders poll and allows opening voters modal for post owner', async () => {
    const user = userEvent.setup();
    const pollPost: PostType = {
      ...basePost,
      isOwner: true,
      poll: {
        id: 'poll-1',
        options: [{ id: 'opt-1', text: 'Blue', votes: 2, votesCount: 2 }],
        totalVotes: 2,
        myVoteOptionId: null,
      },
    };

    renderPostCard(pollPost);

    expect(screen.getByTestId('poll-display')).toBeInTheDocument();
    expect(screen.getByText('Who voted')).toBeInTheDocument();

    await user.click(screen.getByText('Who voted'));
    expect(screen.getByTestId('voters-modal')).toBeInTheDocument();

    await user.click(screen.getByText('Close Voters'));
    expect(screen.queryByTestId('voters-modal')).not.toBeInTheDocument();
  });

  it('opens comment modal when comment button is clicked', async () => {
    const user = userEvent.setup();
    renderPostCard();

    await user.click(screen.getByText('2').closest('button')!);

    const state = useUIStore.getState();
    expect(state.isCommentModalOpen).toBe(true);
    expect(state.activePostForComments).toEqual(basePost);
  });

  it('handles post menu actions for owner: Edit, Delete, Hide likes, Disable comments', () => {
    renderPostCard({ ...basePost, isOwner: true });

    const menuTrigger = screen.getByRole('button', { name: /more options/i });
    fireEvent.click(menuTrigger);

    expect(screen.getByText('Edit post')).toBeInTheDocument();
    expect(screen.getByText('Hide like count')).toBeInTheDocument();
    expect(screen.getByText('Disable commenting')).toBeInTheDocument();

    // Toggle hide like count
    fireEvent.click(screen.getByText('Hide like count'));
    expect(screen.queryByText('5')).not.toBeInTheDocument();

    // Open Edit post modal
    fireEvent.click(menuTrigger);
    fireEvent.click(screen.getByText('Edit post'));
    expect(screen.getByText('Edit information')).toBeInTheDocument();

    // Open Delete post modal
    fireEvent.click(menuTrigger);
    fireEvent.click(screen.getByText('Delete your post'));
    expect(screen.getByText('Delete post?')).toBeInTheDocument();
  });
  it('confirms author blocking, shows pending, and switches the action to unblock', async () => {
    useAuthStore.setState({ userId: 'me', isAuthenticated: true });
    useMessageToastStore.getState().dismissAll();
    const blockedAuthor = {
      id: basePost.authorId,
      username: basePost.handle,
      displayName: basePost.author,
      avatar: null,
    };
    vi.spyOn(chatApi, 'getBlockedUsers').mockResolvedValue([]);
    let finish = (_result: unknown) => {};
    vi.spyOn(chatApi, 'blockUser').mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    vi.spyOn(chatApi, 'unblockUser').mockImplementation(async () => {
      vi.mocked(chatApi.getBlockedUsers).mockResolvedValue([]);
    });
    renderPostCard();
    await screen.findByRole('button', { name: 'Follow' });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Block author' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled());
    expect(useMessageToastStore.getState().toasts).toHaveLength(0);
    vi.mocked(chatApi.getBlockedUsers).mockResolvedValue([blockedAuthor]);
    await act(async () => finish(undefined));
    await screen.findByRole('button', { name: 'Blocked' });
    await waitFor(() =>
      expect(useMessageToastStore.getState().toasts[0]?.title).toBe('Author Blocked'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unblock author' }));
    await screen.findByRole('button', { name: 'Follow' });
    await waitFor(() =>
      expect(useMessageToastStore.getState().toasts[0]?.title).toBe('Author Unblocked'),
    );
  });

  it('reports a failed block and keeps the author followable', async () => {
    useAuthStore.setState({ userId: 'me', isAuthenticated: true });
    useMessageToastStore.getState().dismissAll();
    vi.spyOn(chatApi, 'getBlockedUsers').mockResolvedValue([]);
    vi.spyOn(chatApi, 'blockUser').mockRejectedValue(new Error('Offline'));
    renderPostCard();
    await screen.findByRole('button', { name: 'Follow' });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Block author' }));
    await waitFor(() =>
      expect(useMessageToastStore.getState().toasts[0]?.title).toBe('Action Failed'),
    );
    expect(screen.getByRole('button', { name: 'Follow' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByRole('button', { name: 'Block author' })).toBeEnabled();
  });
});
