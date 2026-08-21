import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContributorBadgeModal from '../ContributorBadgeModal';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'u1', githubUsername: 'dev_user', mergedPrsCount: 3, reportCount: 1 },
  }),
}));

vi.mock('@/entities/profile/model/useGitHubPRCount', () => ({
  useGitHubPRCount: () => ({ data: 3 }),
}));

describe('ContributorBadgeModal', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(<ContributorBadgeModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with contributor tier information and handles close', () => {
    const onClose = vi.fn();
    render(<ContributorBadgeModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Contributor Profile Badges')).toBeInTheDocument();
    expect(screen.getByText('Merged PRs')).toBeInTheDocument();
    expect(screen.getByText('Useful Reports')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
