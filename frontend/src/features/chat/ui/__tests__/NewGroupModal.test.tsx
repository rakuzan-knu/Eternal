import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NewGroupModal from '../NewGroupModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('NewGroupModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders new group modal header, search input, and create button disabled initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewGroupModal onClose={vi.fn()} onCreated={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('New group chat')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by username')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });
});
