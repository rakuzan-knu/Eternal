import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlockUserModal from '../BlockUserModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('BlockUserModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders block user search input and header', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BlockUserModal onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Block someone')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by username')).toBeInTheDocument();
  });
});
