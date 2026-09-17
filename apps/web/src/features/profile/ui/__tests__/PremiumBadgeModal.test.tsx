import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PremiumBadgeModal from '../PremiumBadgeModal';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'u1', subscriptionMonths: 3 },
  }),
}));

describe('PremiumBadgeModal', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(<PremiumBadgeModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders subscription perks and triggers action button', () => {
    const onClose = vi.fn();
    render(<PremiumBadgeModal isOpen={true} onClose={onClose} />);

    expect(
      screen.getByText('Subscribe to Premium to get an evolving profile badge'),
    ).toBeInTheDocument();

    const manageBtn = screen.getByRole('button', { name: /manage subscription/i });
    expect(manageBtn).toBeInTheDocument();
    fireEvent.click(manageBtn);
  });
});
