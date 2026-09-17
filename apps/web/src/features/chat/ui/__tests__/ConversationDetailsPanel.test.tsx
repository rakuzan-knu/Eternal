import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConversationDetailsPanel from '../ConversationDetailsPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ConversationView, MessageView } from '@/entities/chat/model/types';
import { usePresenceStore } from '@/shared/model/usePresenceStore';

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
    expect(screen.getByText('Change theme')).toBeInTheDocument();
    expect(screen.queryByText('Read receipts')).not.toBeInTheDocument();
  });

  it('renders group chat details with leave group and edit group buttons', () => {
    const groupConv = {
      ...mockConv,
      type: 'GROUP' as const,
      name: 'Alpha Team',
      participants: [
        {
          userId: 'usr-1',
          role: 'OWNER',
          user: { id: 'usr-1', username: 'owner', displayName: 'Owner' },
        },
      ],
    } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ConversationDetailsPanel
            conversation={groupConv}
            display={{ title: 'Alpha Team', avatar: null, isGroup: true, otherUserId: null }}
            otherUserId={null}
            messages={[]}
            onClose={vi.fn()}
            onOpenSearch={vi.fn()}
            onJumpToMessage={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Alpha Team')).toBeInTheDocument();
    expect(screen.getByText('Edit group')).toBeInTheDocument();
    expect(screen.getByText('Leave group')).toBeInTheDocument();
  });

  it('renders "Playing [game]" with DiscordGamepadIcon when user is playing a game', () => {
    usePresenceStore.setState({
      onlineUserIds: new Set(['usr-2']),
      userActivities: {
        'usr-2': { type: 'gaming', title: 'Dota 2', isSteam: true },
      },
    });

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

    expect(screen.getByText(/Playing/i)).toBeInTheDocument();
    expect(screen.getByText('Dota 2')).toBeInTheDocument();
  });

  it('handles shared theme unlinking and archive toggle', async () => {
    const { chatApi } = await import('../../api/chatApi');
    const unlinkSpy = vi.spyOn(chatApi, 'unlinkSharedTheme').mockResolvedValue({} as any);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const convWithTheme: any = {
      ...mockConv,
      sharedTheme: { themeId: 'midnight-purple' },
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ConversationDetailsPanel
            conversation={convWithTheme}
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

    expect(screen.getByText('Paired theme active')).toBeInTheDocument();
    const unlinkBtn = screen.getByTitle('Unlink paired theme');
    unlinkBtn.click();

    expect(unlinkSpy).toHaveBeenCalledWith('conv-1');

    unlinkSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it('accurately counts external links in message bodies', () => {
    const mockMessages = [
      {
        id: 'm-1',
        conversationId: 'conv-1',
        senderId: 'usr-2',
        sender: { id: 'usr-2', username: 'alice', displayName: 'Alice' },
        body: 'Check this track out: https://open.spotify.com/track/4rNCvZBSq4ER38uEpJOr3o',
        attachments: [],
        reactions: [],
        readBy: [],
        createdAt: new Date().toISOString(),
      },
    ] as unknown as MessageView[];

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ConversationDetailsPanel
            conversation={mockConv}
            display={{ title: 'Alice Smith', avatar: null, isGroup: false, otherUserId: 'usr-2' }}
            otherUserId="usr-2"
            messages={mockMessages}
            onClose={vi.fn()}
            onOpenSearch={vi.fn()}
            onJumpToMessage={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('1 loaded')).toBeInTheDocument();
  });
});
