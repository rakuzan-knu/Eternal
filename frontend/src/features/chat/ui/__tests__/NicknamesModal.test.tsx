import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NicknamesModal from '../NicknamesModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ConversationView } from '@/entities/chat/model/types';

describe('NicknamesModal', () => {
  const queryClient = new QueryClient();

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

  it('renders nicknames modal header and participants', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NicknamesModal conversation={mockConv} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Nicknames')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });
});
