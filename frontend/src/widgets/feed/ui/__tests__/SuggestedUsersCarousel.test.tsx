import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SuggestedUsersCarousel } from '../SuggestedUsersCarousel';
import * as useSuggestedUsersModule from '@/entities/user/model/useSuggestedUsers';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/entities/profile/ui/MiniProfileHoverCard', () => ({
  MiniProfileHoverCard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/follow/ui/FollowButton', () => ({
  FollowButton: ({ authorId }: { authorId: string }) => (
    <button data-testid={`follow-btn-${authorId}`}>Follow</button>
  ),
}));

describe('SuggestedUsersCarousel', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useSuggestedUsersModule, 'useDismissSuggestedUser').mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useSuggestedUsersModule.useDismissSuggestedUser>);
  });

  it('renders loading skeleton when isLoading is true', () => {
    vi.spyOn(useSuggestedUsersModule, 'useSuggestedUsers').mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useSuggestedUsersModule.useSuggestedUsers>);

    const { container } = render(<SuggestedUsersCarousel />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders suggested creator cards with avatars, mutual info, and follow buttons', () => {
    vi.spyOn(useSuggestedUsersModule, 'useSuggestedUsers').mockReturnValue({
      data: [
        {
          id: 'user-1',
          username: 'creator_one',
          displayName: 'Creator One',
          avatar: '/avatar1.jpg',
          isFollowing: false,
          followsYou: false,
          isVerified: true,
          recommendationReason: {
            type: 'MUTUAL_FRIENDS',
            text: 'Followed by alice and 2 others',
            mutualFriends: [{ id: 'alice', username: 'alice', avatar: '/alice.jpg' }],
            totalMutualCount: 3,
          },
        },
        {
          id: 'user-2',
          username: 'nearby_user',
          displayName: 'Nearby User',
          avatar: null,
          isFollowing: false,
          followsYou: false,
          recommendationReason: {
            type: 'NEARBY',
            text: 'Near Kyiv',
          },
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useSuggestedUsersModule.useSuggestedUsers>);

    render(<SuggestedUsersCarousel title="Suggested for you" />);

    expect(screen.getByText('Suggested for you')).toBeInTheDocument();
    expect(screen.getByText('Creator One')).toBeInTheDocument();
    expect(screen.getByText('@creator_one')).toBeInTheDocument();
    expect(screen.getByText('Followed by alice and 2 others')).toBeInTheDocument();
    expect(screen.getByText('Near Kyiv')).toBeInTheDocument();
    expect(screen.getByTestId('follow-btn-user-1')).toBeInTheDocument();
  });

  it('calls dismissMutation when the ✕ button is clicked', () => {
    vi.spyOn(useSuggestedUsersModule, 'useSuggestedUsers').mockReturnValue({
      data: [
        {
          id: 'user-to-dismiss',
          username: 'bad_suggestion',
          displayName: 'Dismiss Me',
          avatar: null,
          isFollowing: false,
          followsYou: false,
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useSuggestedUsersModule.useSuggestedUsers>);

    render(<SuggestedUsersCarousel />);

    const dismissBtn = screen.getByLabelText('Hide recommendation for bad_suggestion');
    fireEvent.click(dismissBtn);

    expect(mockMutate).toHaveBeenCalledWith('user-to-dismiss');
  });

  it('calls onEmpty callback when users array is empty', () => {
    const onEmptyMock = vi.fn();
    vi.spyOn(useSuggestedUsersModule, 'useSuggestedUsers').mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useSuggestedUsersModule.useSuggestedUsers>);

    render(<SuggestedUsersCarousel onEmpty={onEmptyMock} />);
    expect(onEmptyMock).toHaveBeenCalled();
  });
});
