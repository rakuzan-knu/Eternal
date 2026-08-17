import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserNameWithBadges } from '../UserNameWithBadges';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('UserNameWithBadges', () => {
  const queryClient = new QueryClient();

  it('renders display name and verified checkmark', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UserNameWithBadges displayName="Alex Smith" username="alexsmith" isVerified={true} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Alex Smith')).toBeInTheDocument();
  });

  it('falls back to username when displayName is absent', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UserNameWithBadges username="johndoe" isVerified={false} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('johndoe')).toBeInTheDocument();
  });
});
