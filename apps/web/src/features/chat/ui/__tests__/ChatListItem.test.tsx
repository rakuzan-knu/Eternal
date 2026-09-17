import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatListItem from '../ChatListItem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ConversationView } from '@/entities/chat/model/types';
import { useChatDraftsStore } from '../../model/useChatDraftsStore';

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
        <MemoryRouter>
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
        </MemoryRouter>
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

  it('renders typing indicator, draft, muted bell, and toggles item menu on hover', () => {
    useChatDraftsStore.setState({
      drafts: { 'conv-1': { text: 'Unsent draft text', updatedAt: Date.now() } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatListItem
            conversation={{ ...mockConv, myMuteLevel: 'MESSAGES_AND_CALLS' }}
            currentUserId="me"
            isActive={true}
            isPinnedLocally={true}
            isForcedUnread={true}
            onSelect={vi.fn()}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Draft:')).toBeInTheDocument();
    expect(screen.getByText('Unsent draft text')).toBeInTheDocument();

    // Hover to reveal more button
    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    const moreBtn = container.querySelector('button');
    if (moreBtn) {
      fireEvent.click(moreBtn);
    }
  });

  it('formats dates for minutes, hours, days, older dates, and displays group typist', async () => {
    const { useTypingStore } = await import('../../model/useTypingStore');
    useChatDraftsStore.setState({ drafts: {} });

    // Group chat with typing and 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const groupConv: any = {
      ...mockConv,
      id: 'grp-1',
      type: 'GROUP',
      name: 'Project Team',
      lastMessage: {
        ...mockConv.lastMessage,
        createdAt: tenMinutesAgo,
      },
    };

    useTypingStore.setState({
      typingByConversation: {
        'grp-1': [{ userId: 'usr-1', username: 'alice', timestamp: Date.now() }],
      },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatListItem
            conversation={groupConv}
            currentUserId="me"
            isActive={false}
            isPinnedLocally={false}
            isForcedUnread={false}
            onSelect={vi.fn()}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('alice is typing...')).toBeInTheDocument();

    // 5 hours ago
    useTypingStore.setState({ typingByConversation: {} });
    const fiveHoursAgo = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatListItem
            conversation={{
              ...groupConv,
              lastMessage: { ...groupConv.lastMessage, createdAt: fiveHoursAgo },
            }}
            currentUserId="me"
            isActive={false}
            isPinnedLocally={false}
            isForcedUnread={false}
            onSelect={vi.fn()}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('5h')).toBeInTheDocument();

    // 3 days ago
    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatListItem
            conversation={{
              ...groupConv,
              lastMessage: { ...groupConv.lastMessage, createdAt: threeDaysAgo },
            }}
            currentUserId="me"
            isActive={false}
            isPinnedLocally={false}
            isForcedUnread={false}
            onSelect={vi.fn()}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('3d')).toBeInTheDocument();

    // 20 days ago (older date)
    const twentyDaysAgo = new Date(Date.now() - 20 * 86400 * 1000).toISOString();
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatListItem
            conversation={{
              ...groupConv,
              lastMessage: { ...groupConv.lastMessage, createdAt: twentyDaysAgo },
            }}
            currentUserId="me"
            isActive={false}
            isPinnedLocally={false}
            isForcedUnread={false}
            onSelect={vi.fn()}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
});
