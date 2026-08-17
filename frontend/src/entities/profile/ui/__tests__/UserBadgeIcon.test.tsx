import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { UserBadgeIcon } from '../UserBadgeIcon';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('UserBadgeIcon', () => {
  const queryClient = new QueryClient();

  it('renders null when no badgeId is provided or unknown', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <UserBadgeIcon badgeId={null} />
      </QueryClientProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders developer badge icon when badgeId is DEVELOPER', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <UserBadgeIcon badgeId="DEVELOPER" />
      </QueryClientProvider>,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders premium tier badge when badgeId is PREMIUM', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <UserBadgeIcon badgeId="PREMIUM" subscriptionMonths={12} />
      </QueryClientProvider>,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
