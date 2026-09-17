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

    // Click back to collections
    fireEvent.click(screen.getByText('Back to collections'));
    expect(screen.getByText('All posts')).toBeInTheDocument();
  });

  it('renders custom collection, allows viewing posts and deleting collection', () => {
    useSavedCollectionsStore.setState({
      collections: [
        {
          id: 'col-1',
          userId: 'user-1',
          name: 'Favorites',
          postIds: ['p1'],
          createdAt: '2026-01-01',
        },
      ],
    });

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SavedPostsView userId="user-1" />);

    expect(screen.getByText('Favorites')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Favorites'));

    expect(screen.getByText('1 post')).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Delete collection');
    fireEvent.click(deleteBtn);

    expect(useSavedCollectionsStore.getState().collections).toEqual([]);
  });

  it('opens create collection modal', () => {
    render(<SavedPostsView userId="user-1" />);

    const createBtn = screen.getByRole('button', { name: /Create a new collection/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('New collection')).toBeInTheDocument();
  });
});
