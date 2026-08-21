import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import React from 'react';
import MessengerPage from '../Messenger';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/features/chat/model/useConversations', () => ({
  useConversations: vi.fn(() => ({
    data: [
      { id: 'conv-1', title: 'General Chat' },
      { id: 'conv-2', title: 'Private Chat' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/features/chat/ui/ChatListPanel', () => ({
  default: () => <div data-testid="chat-list-panel" />,
}));

vi.mock('@/features/chat/ui/ChatThread', () => ({
  default: ({ conversation }: { conversation: { id: string } }) => (
    <div data-testid="chat-thread">Chat: {conversation.id}</div>
  ),
}));

describe('MessengerPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders placeholder when no active conversation is selected', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/messages']}>
          <Routes>
            <Route path="/messages" element={<MessengerPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/select a chat to start messaging/i)).toBeInTheDocument();
    expect(screen.getByText(/find friends/i)).toBeInTheDocument();
  });

  it('renders active conversation chat thread when conversationId route param matches', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/messages/conv-1']}>
          <Routes>
            <Route path="/messages/:conversationId" element={<MessengerPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('chat-thread')).toBeInTheDocument();
    expect(screen.getByText('Chat: conv-1')).toBeInTheDocument();
  });
});
