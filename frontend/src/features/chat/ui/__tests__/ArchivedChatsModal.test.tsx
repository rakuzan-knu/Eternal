import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ArchivedChatsModal from '../ArchivedChatsModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ArchivedChatsModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders archive header with locked state by default', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ArchivedChatsModal onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Archived chats')).toBeInTheDocument();
    expect(screen.getByText(/unlock/i)).toBeInTheDocument();
  });
});
