import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageSearchPanel from '../MessageSearchPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('MessageSearchPanel', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders search input and panel header', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MessageSearchPanel conversationId="conv-1" onClose={vi.fn()} onJumpToMessage={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search in chat...')).toBeInTheDocument();
  });
});
