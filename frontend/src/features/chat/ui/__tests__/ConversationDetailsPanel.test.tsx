import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConversationDetailsPanel from '../ConversationDetailsPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ConversationView } from '@/entities/chat/model/types';

describe('ConversationDetailsPanel', () => {
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
    pinnedMessages: [],
    participants: [
      {
        userId: 'usr-2',
        role: 'MEMBER',
        mutedUntil: null,
        joinedAt: new Date().toISOString(),
        nickname: null,
        theme: 'DEFAULT',
        muteLevel: 'NONE',
        user: {
          id: 'usr-2',
          username: 'alice',
          displayName: 'Alice Smith',
          avatar: null,
        },
      },
    ],
  } as unknown as ConversationView;

  it('renders conversation details panel with header and action buttons', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ConversationDetailsPanel
            conversation={mockConv}
            display={{ title: 'Alice Smith', avatar: null, isGroup: false, otherUserId: 'usr-2' }}
            otherUserId="usr-2"
            messages={[]}
            onClose={vi.fn()}
            onOpenSearch={vi.fn()}
            onJumpToMessage={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Chat details')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });
});
