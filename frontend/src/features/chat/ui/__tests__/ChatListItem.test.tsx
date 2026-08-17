import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatListItem from '../ChatListItem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ConversationView } from '@/entities/chat/model/types';

describe('ChatListItem', () => {
  const queryClient = new QueryClient();

  const mockConv = {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    avatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 2,
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
    lastMessage: {
      id: 'msg-1',
      conversationId: 'conv-1',
      body: 'See you tomorrow!',
      createdAt: new Date().toISOString(),
      readBy: [],
      reactions: [],
      attachments: [],
      sender: {
        id: 'usr-1',
        username: 'alice',
        displayName: 'Alice Smith',
        avatar: null,
      },
    },
  } as unknown as ConversationView;

  it('renders chat item with title, preview and unread badge', () => {
    const onSelect = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <ChatListItem
          conversation={mockConv}
          currentUserId="me"
          isActive={false}
          isPinnedLocally={false}
          isForcedUnread={false}
          onSelect={onSelect}
          onTogglePinLocally={vi.fn()}
          onToggleUnreadLocally={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('See you tomorrow!')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(
      screen.getByText('Alice Smith').closest('div[role="button"]') ||
        screen.getByText('Alice Smith'),
    );
    expect(onSelect).toHaveBeenCalledWith('conv-1');
  });
});
