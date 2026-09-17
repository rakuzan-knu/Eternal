import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchPage from '../SearchPage';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock API client
vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn((url) => {
      if (url.startsWith('/users/top')) {
        return Promise.resolve({
          data: [
            {
              id: '1',
              username: 'alex',
              displayName: 'Alex',
              avatar: null,
              followersCount: 2400000,
              isVerified: true,
            },
            {
              id: '2',
              username: 'sofia',
              displayName: 'Sofia',
              avatar: null,
              followersCount: 1900000,
              isVerified: true,
            },
          ],
        });
      }
      if (url.startsWith('/users/trending-hashtags')) {
        return Promise.resolve({
          data: [
            { tag: 'webdev', count: 1200 },
            { tag: 'design', count: 850 },
          ],
        });
      }
      if (url.startsWith('/users/suggested')) {
        return Promise.resolve({
          data: [
            {
              id: 'sug-1',
              username: 'elena_art',
              displayName: 'Elena Art',
              avatar: null,
              followersCount: 35000,
              isVerified: true,
            },
          ],
        });
      }
      if (url === '/users/search') {
        return Promise.resolve({
          data: [
            {
              id: '1',
              username: 'alex',
              displayName: 'Alex Mercer',
              avatar: null,
              followersCount: 2400000,
              isVerified: true,
            },
          ],
        });
      }
      if (url === '/users/hashtags') {
        return Promise.resolve({
          data: [{ tag: 'travel', count: 15 }],
        });
      }
      if (url === '/posts/explore') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'p1',
                content: 'Explore post #travel',
                likesCount: 1200,
                commentsCount: 45,
                media: [{ type: 'image', url: 'https://img.jpg' }],
              },
            ],
            meta: { nextCursor: null },
          },
        });
      }
      if (url === '/posts/search') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'p2',
                content: 'Coding web apps #webdev',
                likesCount: 42,
                commentsCount: 5,
                media: [],
              },
            ],
            meta: { nextCursor: null },
          },
        });
      }
      return Promise.resolve({ data: [] });
    }),
  },
}));

function renderSearchPage(initialEntries = ['/search']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SearchPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the search input and top creators section by default', async () => {
    renderSearchPage();

    expect(screen.getByPlaceholderText(/Search users/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Top by followers')).toBeInTheDocument();
      expect(screen.getByText('Top 5')).toBeInTheDocument();
    });
  });

  it('switches to recent searches and trending view when the search input is focused', async () => {
    renderSearchPage();

    const input = screen.getByPlaceholderText(/Search users/i);
    fireEvent.focus(input);

    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('No recent searches')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Trending Hashtags')).toBeInTheDocument();
      expect(screen.getByText('#webdev')).toBeInTheDocument();
      expect(screen.getByText('Suggested for you')).toBeInTheDocument();
      expect(screen.getByText('Elena Art')).toBeInTheDocument();
    });
  });

  it('loads and displays saved search history from localStorage', async () => {
    localStorage.setItem(
      'recent_searches',
      JSON.stringify([
        {
          id: 'user-1',
          username: 'luna.park',
          displayName: 'Luna Park',
          avatar: null,
          followersCount: 450000,
          isVerified: true,
        },
      ]),
    );

    renderSearchPage();

    const input = screen.getByPlaceholderText(/Search users/i);
    fireEvent.focus(input);

    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('luna.park')).toBeInTheDocument();
    expect(screen.getByText(/Luna Park/)).toBeInTheDocument();
  });

  it('clears recent search history when Clear all is clicked', async () => {
    localStorage.setItem(
      'recent_searches',
      JSON.stringify([
        {
          id: 'user-1',
          username: 'luna.park',
          displayName: 'Luna Park',
          avatar: null,
          followersCount: 450000,
          isVerified: true,
        },
      ]),
    );

    renderSearchPage();

    const input = screen.getByPlaceholderText(/Search users/i);
    fireEvent.focus(input);

    const clearButton = screen.getByText('Clear all');
    fireEvent.click(clearButton);

    expect(screen.getByText('No recent searches')).toBeInTheDocument();
    expect(localStorage.getItem('recent_searches')).toBeNull();
  });

  it('renders segmented search tabs when a query is entered and allows switching tabs', async () => {
    renderSearchPage(['/search?q=alex']);

    const peopleTab = screen.getByRole('button', { name: /People/i });
    const postsTab = screen.getByRole('button', { name: /Posts/i });
    const hashtagsTab = screen.getByRole('button', { name: /Hashtags/i });
    const mediaTab = screen.getByRole('button', { name: /Media/i });

    expect(peopleTab).toBeInTheDocument();
    expect(postsTab).toBeInTheDocument();
    expect(hashtagsTab).toBeInTheDocument();
    expect(mediaTab).toBeInTheDocument();

    fireEvent.click(peopleTab);
    fireEvent.click(postsTab);
    fireEvent.click(hashtagsTab);
    fireEvent.click(mediaTab);
  });

  it('handles clicking trending hashtags to set search query', async () => {
    renderSearchPage();

    const input = screen.getByPlaceholderText(/Search users/i);
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('#webdev')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('#webdev'));
    expect(input).toHaveValue('#webdev');
  });

  it('clears input with clear button and handles back button', async () => {
    renderSearchPage();

    const input = screen.getByPlaceholderText(/Search users/i) as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'some query' } });

    expect(input.value).toBe('some query');

    const backButton = screen.getByTitle('Go back');
    fireEvent.click(backButton);

    expect(input.value).toBe('');
  });
});
