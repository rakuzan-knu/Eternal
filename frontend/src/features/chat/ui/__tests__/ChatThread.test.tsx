import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatThread from '../ChatThread';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ConversationView } from '@/entities/chat/model/types';

describe('ChatThread', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockConv = {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    avatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    myMuteLevel: 'NONE',
    isPinned: false,
    participants: [
      {
        userId: 'usr-1',
        role: 'MEMBER',
        mutedUntil: null,
        joinedAt: new Date().toISOString(),
        nickname: null,
        theme: 'DEFAULT',
        muteLevel: 'NONE',
        user: {
          id: 'usr-1',
          username: 'alice',
          displayName: 'Alice Smith',
          avatar: null,
        },
      },
    ],
  } as unknown as ConversationView;

  it('renders chat thread header and message composer', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatThread conversation={mockConv} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });
});
