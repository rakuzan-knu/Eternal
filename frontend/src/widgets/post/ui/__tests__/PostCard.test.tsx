import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PostCard } from '../PostCard';
import { useUIStore, PostType } from '@/shared/model/useUIStore';
import { resetUIStore } from '@/test/resetUIStore';

vi.mock('@/entities/post/ui/PostMedia', () => ({
  PostMedia: ({ media }: { media: { url: string }[] }) =>
    media.length > 0 ? <img alt="Post Attachment" src={media[0].url} /> : null,
}));

vi.mock('@/shared/lib/formatRelativeTime', () => ({
  formatRelativeTime: () => '3h',
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
};

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

describe('PostCard', () => {
  afterEach(() => {
    resetUIStore();
  });

  it('renders author, handle, time, text and counters', () => {
    renderPostCard();

    expect(screen.getByText('Ayate')).toBeInTheDocument();
    expect(screen.getByText('@ayate • 3h')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
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

  it('does not render an image when post.image is absent', () => {
    renderPostCard();

    expect(screen.queryByAltText('Post Attachment')).not.toBeInTheDocument();
  });

  it('opens the comment modal for this post when the comment button is clicked', async () => {
    const user = userEvent.setup();
    renderPostCard();

    await user.click(screen.getByText('2').closest('button')!);

    const state = useUIStore.getState();
    expect(state.isCommentModalOpen).toBe(true);
    expect(state.activePostForComments).toEqual(basePost);
  });

  it('re-clicking the comment button keeps the modal open with the latest post', async () => {
    const user = userEvent.setup();
    renderPostCard();
    const commentButton = screen.getByText('2').closest('button')!;

    await user.click(commentButton);
    await user.click(commentButton);

    expect(useUIStore.getState().isCommentModalOpen).toBe(true);
  });
});
