import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountReputationPanel, { ViolationRecord } from '../AccountReputationPanel';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'usr-1',
      username: 'ayate',
      displayName: 'Ayate',
      avatar: 'https://example.com/avatar.png',
    },
  }),
}));

describe('AccountReputationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders good standing status, timeline, and zero-violation fallbacks', () => {
    const onClose = vi.fn();
    render(<AccountReputationPanel onClose={onClose} tier="good" violations={[]} />);

    // Breadcrumb title
    expect(screen.getByText(/Account \/ Account Reputation/i)).toBeInTheDocument();

    // Good standing text
    expect(screen.getByText(/in good standing/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText(/Community Guidelines/i)).toBeInTheDocument();

    // Timeline stages
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Limited')).toBeInTheDocument();
    expect(screen.getByText('Very Limited')).toBeInTheDocument();
    expect(screen.getByText('At Risk')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();

    // Accordions
    const activeBtn = screen.getByRole('button', { name: /Active Violations: 0/i });
    expect(activeBtn).toBeInTheDocument();
    fireEvent.click(activeBtn);
    expect(
      screen.getByText(/Your account currently has no active violations/i),
    ).toBeInTheDocument();

    const expiredBtn = screen.getByRole('button', { name: /Expired Violations: 0/i });
    expect(expiredBtn).toBeInTheDocument();
    fireEvent.click(expiredBtn);
    expect(screen.getByText(/Your account has no expired violations/i)).toBeInTheDocument();
  });

  it('renders violation card when violations exist', () => {
    const mockViolations: ViolationRecord[] = [
      {
        id: 'viol-1',
        ruleTitle: 'child safety',
        description: 'Inappropriate behavior in chat',
        timestamp: '1 year ago',
        isExpired: false,
      },
    ];

    render(<AccountReputationPanel onClose={vi.fn()} tier="limited" violations={mockViolations} />);

    expect(screen.getByText(/Your account status is/i)).toHaveTextContent(/limited/i);
    const activeBtn = screen.getByRole('button', { name: /Active Violations: 1/i });
    fireEvent.click(activeBtn);

    expect(screen.getByText(/child safety/i)).toBeInTheDocument();
    expect(screen.getByText('1 year ago')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
