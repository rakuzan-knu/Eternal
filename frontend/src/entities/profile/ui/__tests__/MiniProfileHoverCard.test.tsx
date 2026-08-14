import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MiniProfileHoverCard } from '../MiniProfileHoverCard';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url.startsWith('/users/by-username/voguemagazine')) {
        return Promise.resolve({
          data: {
            id: 'vogue-123',
            username: 'voguemagazine',
            displayName: 'Vogue',
            avatar: 'https://cdn.example.com/vogue.jpg',
            banner: 'https://cdn.example.com/vogue-banner.jpg',
            bannerPosition: 50,
            bio: 'The latest fashion news and trends.',
            isVerified: true,
            followersCount: 51700000,
            followingCount: 418,
            postsCount: 19400,
            isFollowing: false,
          },
        });
      }
      return Promise.resolve({ data: null });
    }),
  },
}));

vi.mock('@/entities/post/api/postsApi', () => ({
  postsApi: {
    getUserPosts: vi.fn(() =>
      Promise.resolve({
        posts: [
          {
            id: 'p1',
            text: 'Vogue Summer Issue',
            media: [{ type: 'image', url: 'https://cdn.example.com/p1.jpg' }],
            likes: 1200,
          },
          {
            id: 'p2',
            text: 'Runway Highlights',
            media: [{ type: 'video', url: 'https://cdn.example.com/p2.mp4' }],
            likes: 3500,
          },
          { id: 'p3', text: 'Exclusive Interview', media: [], likes: 850 },
        ],
      }),
    ),
  },
}));

function renderHoverCard(username = 'voguemagazine') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MiniProfileHoverCard username={username}>
          <span data-testid="trigger">@voguemagazine</span>
        </MiniProfileHoverCard>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MiniProfileHoverCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children trigger normally', () => {
    renderHoverCard();
    expect(screen.getByTestId('trigger')).toBeInTheDocument();
  });

  it('opens hover popup with banner, avatar, username and liquid glass stats on mouse enter', async () => {
    renderHoverCard();

    const trigger = screen.getByTestId('trigger');
    fireEvent.mouseEnter(trigger.parentElement || trigger);

    await waitFor(
      () => {
        expect(screen.getAllByText('voguemagazine').length).toBeGreaterThan(0);
        expect(screen.getByText('Vogue')).toBeInTheDocument();
        expect(screen.getByText('The latest fashion news and trends.')).toBeInTheDocument();
        expect(screen.getByText('19.4K')).toBeInTheDocument();
        expect(screen.getByText('51.7M')).toBeInTheDocument();
        expect(screen.getByText('418')).toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  });

  it('displays Message and Follow action buttons', async () => {
    renderHoverCard();

    const trigger = screen.getByTestId('trigger');
    fireEvent.mouseEnter(trigger.parentElement || trigger);

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /Message/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Follow/i })).toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  });
});
