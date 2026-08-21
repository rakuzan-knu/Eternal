import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PostCard } from '../PostCard';
import { useUIStore, PostType } from '@/shared/model/useUIStore';
import { resetUIStore } from '@/test/resetUIStore';
import * as useLikeMutationModule from '@/features/posts/model/useLikeMutation';
import * as useRepostMutationModule from '@/features/posts/model/useRepostMutation';
import * as useSavePostMutationModule from '@/features/posts/model/useSavePostMutation';
import * as useDeletePostMutationModule from '@/features/posts/model/useDeletePostMutation';
import * as usePinPostMutationModule from '@/features/posts/model/usePinPostMutation';

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
  });

  afterEach(() => {
    resetUIStore();
    vi.clearAllMocks();
  });

  function renderPostCard(post: PostType = basePost) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PostCard post={post} queryKey={['test']} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('renders author, handle, time, text and counters', () => {
    renderPostCard();

    expect(screen.getByText('Ayate')).toBeInTheDocument();
    expect(screen.getByText('@ayate • 3h')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not render the repost banner for a regular post', () => {
    renderPostCard();

    expect(screen.queryByText(/репостнули|Ви репостнули/i)).not.toBeInTheDocument();
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

  it('handles like click', async () => {
    const user = userEvent.setup();
    renderPostCard();

    const likeButton = screen.getByTitle('Like');
    await user.click(likeButton);

    expect(mockLikeMutate).toHaveBeenCalled();
  });

  it('handles repost click', async () => {
    const user = userEvent.setup();
    renderPostCard();

    const repostButton = screen.getByTitle('Repost');
    await user.click(repostButton);

    expect(mockRepostMutate).toHaveBeenCalled();
  });

  it('handles save click', async () => {
    const user = userEvent.setup();
    renderPostCard();

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

  it('opens the comment modal for this post when the comment button is clicked', async () => {
    const user = userEvent.setup();
    renderPostCard();

    await user.click(screen.getByText('2').closest('button')!);

    const state = useUIStore.getState();
    expect(state.isCommentModalOpen).toBe(true);
    expect(state.activePostForComments).toEqual(basePost);
  });
});
