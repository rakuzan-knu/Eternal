import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProfileHeader from '../ProfileHeader';

vi.mock('@/features/follow/ui/UserListModal', () => ({
  UserListModal: ({ mode }: { mode: 'followers' | 'following' }) => (
    <div data-testid="mock-user-list-modal">{mode}</div>
  ),
}));

vi.mock('@/features/follow/ui/FollowButton', () => ({
  FollowButton: () => <button>Follow</button>,
}));

const defaultProps = {
  userId: 'user-1',
  username: 'ayate',
  isOwnProfile: true,
  onEditClick: vi.fn(),
};

describe('ProfileHeader', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the username with an @ prefix', () => {
    render(<ProfileHeader {...defaultProps} />);

    expect(screen.getByText('@ayate')).toBeInTheDocument();
  });

  it('calls onEditClick exactly once when the edit button is clicked', async () => {
    const onEditClick = vi.fn();
    const user = userEvent.setup();
    render(<ProfileHeader {...defaultProps} onEditClick={onEditClick} />);

    await user.click(screen.getByText('Edit'));

    expect(onEditClick).toHaveBeenCalledTimes(1);
  });

  it('opens the followers list when the followers count is clicked', async () => {
    const user = userEvent.setup();
    render(<ProfileHeader {...defaultProps} followersCount={12} />);

    await user.click(screen.getByText(/followers/i));

    expect(screen.getByTestId('mock-user-list-modal')).toHaveTextContent('followers');
  });

  it('opens the following list when the following count is clicked', async () => {
    const user = userEvent.setup();
    render(<ProfileHeader {...defaultProps} followingCount={8} />);

    await user.click(screen.getByText(/following/i));

    expect(screen.getByTestId('mock-user-list-modal')).toHaveTextContent('following');
  });

  it('does not call onEditClick when only the followers count is clicked', async () => {
    const onEditClick = vi.fn();
    const user = userEvent.setup();
    render(<ProfileHeader {...defaultProps} onEditClick={onEditClick} followersCount={12} />);

    await user.click(screen.getByText(/followers/i));

    expect(onEditClick).not.toHaveBeenCalled();
  });
});
