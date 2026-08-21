import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from '../SearchPage';
import { renderWithProviders } from '@/test/renderWithProviders';
import { apiClient as api } from '@/shared/api/httpClient';
import { postsApi } from '@/entities/post/api/postsApi';
import { userApi } from '@/entities/profile/api/userApi';
import { useAuthStore } from '@/shared/model/useAuthStore';

describe('SearchPage (Comprehensive Suite)', () => {
  const mockSuggested = [
    {
      id: 's-1',
      username: 'marie_curie',
      displayName: 'Marie Curie',
      avatar: 'https://example.com/curie.jpg',
      followersCount: 54000,
      isFollowing: false,
    },
  ];

  const mockTrendingHashtags = [
    { tag: 'science', count: 1200 },
    { tag: 'react', count: 850 },
  ];

  const mockExplorePosts = [
    {
      id: 'exp-1',
      authorId: 'auth-1',
      author: 'Marie Curie',
      handle: 'marie_curie',
      avatar: null,
      text: 'Discovery of radium and polonium! #science',
      likes: 340,
      comments: 25,
      reposts: 8,
      media: [{ type: 'image', url: 'https://example.com/radium.jpg' }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ userId: 'current-user-1' });

    vi.spyOn(userApi, 'getMe').mockResolvedValue({
      id: 'current-user-1',
      username: 'current',
    } as any);
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/trending-hashtags')) return { data: mockTrendingHashtags };
      if (url.includes('/suggested')) return { data: mockSuggested };
      if (url.includes('/top')) return { data: mockSuggested };
      if (url.includes('/users/search')) return { data: mockSuggested };
      if (url.includes('/users/hashtags')) return { data: mockTrendingHashtags };
      return { data: [] };
    });

    vi.spyOn(postsApi, 'getExplorePosts').mockResolvedValue({
      posts: mockExplorePosts as any,
      nextCursor: null,
    });
    vi.spyOn(postsApi, 'searchPosts').mockResolvedValue({
      posts: mockExplorePosts as any,
      nextCursor: null,
    });
  });

  it('renders search input, top creators by followers, and explore media grid', async () => {
    renderWithProviders(<SearchPage />);

    expect(screen.getByPlaceholderText(/search users, #hashtags, posts.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Explore Media')).toBeInTheDocument();
      expect(screen.getByText('Top by followers')).toBeInTheDocument();
    });
  });

  it('shows dropdown with trending hashtags and suggested creators on focus', async () => {
    renderWithProviders(<SearchPage />);

    const input = screen.getByPlaceholderText(/search users, #hashtags, posts.../i);
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Trending Hashtags')).toBeInTheDocument();
      expect(screen.getByText('#science')).toBeInTheDocument();
      expect(screen.getByText('Suggested for you')).toBeInTheDocument();
    });
  });

  it('switches search tabs (All, People, Posts, Hashtags, Media) when typing query', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<SearchPage />);

    const input = screen.getByPlaceholderText(/search users, #hashtags, posts.../i);
    await user.type(input, 'science');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /people/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /posts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hashtags/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /media/i })).toBeInTheDocument();
    });

    const postsTab = screen.getByRole('button', { name: /posts/i });
    await user.click(postsTab);

    expect(postsTab).toHaveClass('text-purple-400');
  });
});
