import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AddMembersModal from '../AddMembersModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('AddMembersModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders add members title, search input, and add button disabled initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AddMembersModal conversationId="conv-1" existingMemberIds={['usr-1']} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Add members')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by username')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });
});
