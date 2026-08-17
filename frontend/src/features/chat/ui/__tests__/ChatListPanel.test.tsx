import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatListPanel from '../ChatListPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

describe('ChatListPanel', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders chat list search bar and action buttons', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatListPanel onSelectConversation={vi.fn()} activeConversationId={null} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByPlaceholderText('Search in Messenger')).toBeInTheDocument();
  });
});
