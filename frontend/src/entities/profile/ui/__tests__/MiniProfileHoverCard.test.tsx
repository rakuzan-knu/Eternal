import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { MiniProfileHoverCard } from '../MiniProfileHoverCard';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

function renderWithWrapper(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MiniProfileHoverCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger element and opens card on mouse enter', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        id: 'u1',
        username: 'alice',
        displayName: 'Alice Wonderland',
        bio: 'Building cool things',
        avatar: 'https://avatar.png',
        banner: 'https://banner.png',
        followersCount: 150,
        followingCount: 75,
        postsCount: 20,
        isVerified: true,
        primaryBadge: 'MODERATOR',
      },
    });

    renderWithWrapper(
      <MiniProfileHoverCard username="alice">
        <span>@alice</span>
      </MiniProfileHoverCard>,
    );

    const trigger = screen.getByText('@alice');
    act(() => {
      fireEvent.mouseEnter(trigger);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Wonderland')).toBeInTheDocument();
      expect(screen.getByText('Building cool things')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.mouseLeave(trigger);
    });
  });
});
