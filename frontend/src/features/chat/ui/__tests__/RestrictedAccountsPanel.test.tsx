import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RestrictedAccountsPanel from '../RestrictedAccountsPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('RestrictedAccountsPanel', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders restricted accounts panel with block someone new button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RestrictedAccountsPanel onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Restricted accounts')).toBeInTheDocument();
    expect(screen.getByText('Block someone new')).toBeInTheDocument();
  });
});
