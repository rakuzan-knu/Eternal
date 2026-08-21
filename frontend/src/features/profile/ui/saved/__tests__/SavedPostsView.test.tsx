import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavedPostsView } from '../SavedPostsView';
import { useSavedCollectionsStore } from '@/entities/post/model/useSavedCollectionsStore';

vi.mock('@/entities/post/model/useSavedPosts', () => ({
  useSavedPosts: () => ({
    data: {
      pages: [
        {
          posts: [
            {
              id: 'p1',
              authorId: 'u1',
              author: 'Alice',
              handle: 'alice',
              avatar: null,
              text: 'Saved post text',
              createdAt: '2026-01-01',
              likes: 0,
              comments: 0,
              reposts: 0,
              sharesCount: 0,
              isLiked: false,
              isReposted: false,
              isSaved: true,
              isFollowing: false,
              isOwner: false,
              media: [],
            },
          ],
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('@/widgets/post/ui/PostCard', () => ({
  PostCard: ({ post }: { post: { text: string } }) => (
    <div data-testid="post-card">{post.text}</div>
  ),
}));

describe('SavedPostsView', () => {
  it('renders root collections view and opens all posts collection', () => {
    useSavedCollectionsStore.setState({ collections: [] });

    render(<SavedPostsView userId="user-1" />);

    expect(screen.getByText('All posts')).toBeInTheDocument();
    expect(screen.getByText('1 post')).toBeInTheDocument();

    const allPostsCard = screen.getByText('All posts');
    fireEvent.click(allPostsCard);

    expect(screen.getByTestId('post-card')).toHaveTextContent('Saved post text');
    expect(screen.getByText('Back to collections')).toBeInTheDocument();
  });
});
