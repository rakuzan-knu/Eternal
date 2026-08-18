import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { FollowButton } from '../FollowButton';
import * as useFollowMutationModule from '../../model/useFollowMutation';
import { useAuthStore } from '@/shared/model/useAuthStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { id: 'my-user-id', username: 'me' } }),
}));

describe('FollowButton', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ userId: 'my-user-id', isAuthenticated: true });
    vi.spyOn(useFollowMutationModule, 'useFollowMutation').mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useFollowMutationModule.useFollowMutation>);
  });

  const renderComponent = (props: React.ComponentProps<typeof FollowButton>) =>
    render(
      <MemoryRouter>
        <FollowButton {...props} />
      </MemoryRouter>,
    );

  it('renders nothing when authorId is the current user ID or username', () => {
    const { container: c1 } = renderComponent({ authorId: 'my-user-id', isFollowing: false });
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = renderComponent({ authorId: 'me', isFollowing: false });
    expect(c2.firstChild).toBeNull();
  });

  it('renders "Follow" when isFollowing is false', () => {
    renderComponent({ authorId: 'user-1', isFollowing: false });
    const btn = screen.getByRole('button', { name: 'Follow' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('min-w-[94px]');
    expect(btn.className).toContain('whitespace-nowrap');
  });

  it('renders "Following" when following a one-way user', () => {
    renderComponent({ authorId: 'user-1', isFollowing: true, isFriend: false });
    expect(screen.getByRole('button', { name: 'Following' })).toBeInTheDocument();
  });

  it('renders "Friends" when users follow each other (mutual friends)', () => {
    renderComponent({ authorId: 'user-1', isFollowing: true, isFriend: true });
    expect(screen.getByRole('button', { name: /Friends/i })).toBeInTheDocument();
  });

  it('changes label to "Unfollow" on hover when following (one-way) and calls mutate on click', () => {
    renderComponent({ authorId: 'user-1', isFollowing: true, isFriend: false });
    const btn = screen.getByRole('button', { name: 'Following' });

    fireEvent.mouseEnter(btn);
    expect(screen.getByRole('button', { name: 'Unfollow' })).toBeInTheDocument();

    fireEvent.click(btn);
    expect(mockMutate).toHaveBeenCalled();

    fireEvent.mouseLeave(btn);
    expect(screen.getByRole('button', { name: 'Following' })).toBeInTheDocument();
  });

  it('opens subtle dropdown when clicking Friends button, and calls mutate on Unfriend', () => {
    renderComponent({ authorId: 'user-1', isFollowing: true, isFriend: true });
    const btn = screen.getByRole('button', { name: /Friends/i });

    // Open dropdown
    fireEvent.click(btn);
    expect(screen.getByText('Send message')).toBeInTheDocument();
    expect(screen.getByText('Unfriend')).toBeInTheDocument();

    // Click Unfriend
    fireEvent.click(screen.getByText('Unfriend'));
    expect(mockMutate).toHaveBeenCalled();
  });
});
