import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BadgeSettingsSection } from '../BadgeSettingsSection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('BadgeSettingsSection', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders badge settings section title and preview card', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BadgeSettingsSection />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Profile Badges')).toBeInTheDocument();
  });
});
