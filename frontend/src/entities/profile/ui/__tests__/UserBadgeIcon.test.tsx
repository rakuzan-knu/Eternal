import { render } from '@testing-library/react';
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

  it('renders premium and contributor badges', () => {
    const { container: c1 } = renderBadge(
      <UserBadgeIcon badgeId="PREMIUM" subscriptionMonths={3} />,
    );
    expect(c1.querySelector('svg')).toBeInTheDocument();

    const { container: c2 } = renderBadge(<UserBadgeIcon badgeId="CONTRIBUTOR" prCount={5} />);
    expect(c2.querySelector('svg')).toBeInTheDocument();
  });
});
