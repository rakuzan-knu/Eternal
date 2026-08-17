import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MiniProfileHoverCard } from '../MiniProfileHoverCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '@/shared/api/httpClient';

describe('MiniProfileHoverCard', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders trigger children and opens hover card on mouse enter', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        id: 'usr-1',
        username: 'alice',
        displayName: 'Alice Smith',
        avatar: null,
        bio: 'Tech enthusiast',
        followersCount: 150,
        followingCount: 75,
        isFollowing: false,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MiniProfileHoverCard username="alice">
            <span>@alice</span>
          </MiniProfileHoverCard>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const trigger = screen.getByText('@alice');
    expect(trigger).toBeInTheDocument();

    fireEvent.mouseEnter(trigger);

    await waitFor(
      () => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });
});
