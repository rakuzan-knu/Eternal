import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserBadgeIcon } from '../UserBadgeIcon';

function renderBadge(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UserBadgeIcon', () => {
  it('renders nothing when badgeId is null or unknown', () => {
    const { container } = renderBadge(<UserBadgeIcon badgeId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders developer badge correctly', () => {
    const { container } = renderBadge(
      <UserBadgeIcon badgeId="DEVELOPER" size="sm" showTooltip={true} />,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders partner and moderator badges', () => {
    const { container: c1 } = renderBadge(<UserBadgeIcon badgeId="PARTNER" />);
    expect(c1.querySelector('svg')).toBeInTheDocument();

    const { container: c2 } = renderBadge(<UserBadgeIcon badgeId="MODERATOR" />);
    expect(c2.querySelector('svg')).toBeInTheDocument();
  });

  it('renders premium and contributor badges and handles modal clicks', () => {
    const { container: c1 } = renderBadge(
      <UserBadgeIcon badgeId="PREMIUM" subscriptionMonths={3} />,
    );
    expect(c1.querySelector('svg')).toBeInTheDocument();

    const iconWrapper = c1.querySelector('.cursor-pointer') as HTMLElement;
    fireEvent.click(iconWrapper);

    const { container: c2 } = renderBadge(<UserBadgeIcon badgeId="CONTRIBUTOR" prCount={5} />);
    expect(c2.querySelector('svg')).toBeInTheDocument();

    const contributorWrapper = c2.querySelector('.cursor-pointer') as HTMLElement;
    fireEvent.click(contributorWrapper);
  });

  it('renders tooltip for level 0 premium with subscriptionMonths > 0 and 0', () => {
    renderBadge(
      <UserBadgeIcon badgeId="PREMIUM" subscriptionMonths={0.5} subscriptionDate="01.01.2026" />,
    );
    expect(screen.getByText(/Subscriber since 01\.01\.2026/)).toBeInTheDocument();

    renderBadge(<UserBadgeIcon badgeId="PREMIUM" subscriptionMonths={0} />);
    expect(screen.getByText('No active subscription')).toBeInTheDocument();
  });

  it('renders Platinum tier for Contributor with 11 merged PRs', () => {
    const { getByText } = renderBadge(
      <UserBadgeIcon badgeId="CONTRIBUTOR" prCount={11} showTooltip={true} />,
    );
    expect(getByText(/Platinum Contributor/i)).toBeInTheDocument();
    expect(getByText(/11 Merged PRs & Reports/i)).toBeInTheDocument();
  });

  it('renders tiered CONTRIBUTOR_PLATINUM badge correctly', () => {
    const { getByText } = renderBadge(
      <UserBadgeIcon badgeId="CONTRIBUTOR_PLATINUM" showTooltip={true} />,
    );
    expect(getByText(/Platinum Contributor/i)).toBeInTheDocument();
  });
});
