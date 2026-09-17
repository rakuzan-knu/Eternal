import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import BadgeList from '../BadgeList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Badge } from '../BadgeModal';

describe('BadgeList', () => {
  const queryClient = new QueryClient();

  const mockBadges: Badge[] = [
    { id: 'DEVELOPER', name: 'Developer', description: 'Staff dev', icon: <span /> },
    { id: 'PREMIUM', name: 'Premium', description: 'Subscriber', icon: <span /> },
  ];

  it('renders null when no badges provided', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BadgeList badges={[]} />
      </QueryClientProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders visible badge icons', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BadgeList badges={mockBadges} />
      </QueryClientProvider>,
    );
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});
