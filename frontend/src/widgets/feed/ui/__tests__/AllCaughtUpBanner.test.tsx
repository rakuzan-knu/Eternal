import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AllCaughtUpBanner } from '../AllCaughtUpBanner';
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
  FollowButton: () => <button>Follow</button>,
}));

describe('AllCaughtUpBanner', () => {
  it('renders milestone message "You\'re all caught up"', () => {
    vi.spyOn(useSuggestedUsersModule, 'useSuggestedUsers').mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useSuggestedUsersModule.useSuggestedUsers>);

    vi.spyOn(useSuggestedUsersModule, 'useDismissSuggestedUser').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSuggestedUsersModule.useDismissSuggestedUser>);

    render(<AllCaughtUpBanner showCarousel={false} />);

    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    expect(screen.getByText("You've seen all new posts from the past 3 days.")).toBeInTheDocument();
  });
});
