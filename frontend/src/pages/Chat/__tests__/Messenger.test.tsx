import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessengerPage from '../Messenger';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

describe('MessengerPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders placeholder when no active conversation is selected', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/messages']}>
          <MessengerPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/select a chat to start messaging/i)).toBeInTheDocument();
    expect(screen.getByText(/find friends/i)).toBeInTheDocument();
  });
});
