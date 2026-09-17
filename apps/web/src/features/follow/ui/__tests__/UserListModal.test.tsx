import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserListModal } from '../UserListModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import * as useFollowListModule from '../../model/useFollowList';
import * as useRemoveFollowerModule from '../../model/useRemoveFollowerMutation';

describe('UserListModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders modal title, searches users, displays follows-you badge, remove button and pagination', () => {
    const mockUsers = [
      {
        id: 'u-1',
        username: 'alice',
        displayName: 'Alice Smith',
        avatar: null,
        isFollowing: false,
        followsYou: true,
      },
      {
        id: 'u-2',
        username: 'bob',
        displayName: 'Bob Jones',
        avatar: null,
        isFollowing: true,
        followsYou: false,
      },
    ];

    const fetchNextPage = vi.fn();
    vi.spyOn(useFollowListModule, 'useFollowList').mockReturnValue({
      data: { pages: [{ items: mockUsers }] },
      isLoading: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    } as any);

    const removeMutate = vi.fn();
    vi.spyOn(useRemoveFollowerModule, 'useRemoveFollowerMutation').mockReturnValue({
      mutate: removeMutate,
      isPending: false,
    } as any);

    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <UserListModal userId="usr-me" mode="followers" isOwnProfile={true} onClose={onClose} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Follows You')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();

    // Click remove follower
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    fireEvent.click(removeButtons[0]);
    expect(removeMutate).toHaveBeenCalledWith('u-1');

    // Search filter
    const searchInput = screen.getByPlaceholderText(/search by name or username/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();

    // Clear search
    const clearBtn = searchInput.parentElement!.querySelector('button')!;
    fireEvent.click(clearBtn);
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();

    // Pagination
    const loadMoreBtn = screen.getByRole('button', { name: 'Load more' });
    fireEvent.click(loadMoreBtn);
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('renders loading skeleton and empty state', () => {
    vi.spyOn(useFollowListModule, 'useFollowList').mockReturnValue({
      data: { pages: [{ items: [] }] },
      isLoading: true,
    } as any);

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <UserListModal userId="usr-1" mode="following" isOwnProfile={false} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

    // Now empty state
    vi.spyOn(useFollowListModule, 'useFollowList').mockReturnValue({
      data: { pages: [{ items: [] }] },
      isLoading: false,
      hasNextPage: false,
    } as any);

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <UserListModal userId="usr-1" mode="following" isOwnProfile={false} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Not following anyone')).toBeInTheDocument();
    expect(screen.getByText('Find friends here')).toBeInTheDocument();
  });
});
