import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  default: () => (
    <div data-testid="chat-list-panel">
      <button id="conversation-conv-1">General Chat</button>
    </div>
  ),
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

  it('returns focus when the virtual conversation row mounts after navigation', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/messages/conv-1']}>
          <Routes>
            <Route path="/messages" element={<MessengerPage />} />
            <Route path="/messages/:conversationId" element={<MessengerPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const row = screen.getByRole('button', { name: 'General Chat' });
    const list = row.parentElement!;
    row.remove();
    fireEvent.click(screen.getByRole('button', { name: 'Back to chats' }));
    act(() => list.appendChild(row));
    await waitFor(() => expect(row).toHaveFocus());
  });
});
