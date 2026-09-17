import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageList from '../MessageList';
import { MessageView } from '@/entities/chat/model/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('MessageList', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  it('renders empty conversation view when messages array is empty', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MessageList
          messages={[]}
          currentUserId="u1"
          otherParticipantId="u2"
          display={{ title: 'Alice', isGroup: false }}
          hasMore={false}
          isLoading={false}
          isFetchingMore={false}
          typingParticipants={[]}
          isGroup={false}
          onLoadMore={vi.fn()}
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(
      screen.getByText(/No messages here yet. Send a greeting to start the conversation!/i),
    ).toBeInTheDocument();
  });

  it('renders clustered messages, system messages and selection mode checkboxes', () => {
    const onToggleSelectMessage = vi.fn();
    const time = '2026-01-01T12:00:00Z';
    const mockMessages = [
      {
        id: 'msg-1',
        conversationId: 'c1',
        senderId: 'u1',
        sender: { id: 'u1', username: 'u1', displayName: 'User 1', avatar: null },
        body: 'First clustered',
        createdAt: time,
        reactions: [],
        attachments: [],
        readBy: [],
      } as unknown as MessageView,
      {
        id: 'msg-2',
        conversationId: 'c1',
        senderId: 'u1',
        sender: { id: 'u1', username: 'u1', displayName: 'User 1', avatar: null },
        body: 'Middle clustered',
        createdAt: time,
        reactions: [],
        attachments: [],
        readBy: [],
      } as unknown as MessageView,
      {
        id: 'msg-3',
        conversationId: 'c1',
        senderId: 'u1',
        sender: { id: 'u1', username: 'u1', displayName: 'User 1', avatar: null },
        body: 'Last clustered',
        createdAt: time,
        reactions: [],
        attachments: [],
        readBy: [],
      } as unknown as MessageView,
      {
        id: 'msg-sys-1',
        conversationId: 'c1',
        messageType: 'SYSTEM',
        body: 'User 1 joined',
        createdAt: time,
        reactions: [],
        attachments: [],
        readBy: [],
      } as unknown as MessageView,
    ];

    render(
      <QueryClientProvider client={queryClient}>
        <MessageList
          messages={mockMessages}
          currentUserId="u1"
          otherParticipantId="u2"
          hasMore={false}
          isLoading={false}
          isFetchingMore={false}
          isSelectionMode={true}
          selectedMessageIds={new Set(['msg-1'])}
          onToggleSelectMessage={onToggleSelectMessage}
          typingParticipants={[{ userId: 'u2', username: 'u2', isTyping: true } as any]}
          isGroup={false}
          onLoadMore={vi.fn()}
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('First clustered')).toBeInTheDocument();
    expect(screen.getByText('Middle clustered')).toBeInTheDocument();
    expect(screen.getByText('Last clustered')).toBeInTheDocument();
    expect(screen.getByText('User 1 joined')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true and date separator click', () => {
    const onOpenDatePicker = vi.fn();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MessageList
          messages={[]}
          currentUserId="u1"
          otherParticipantId="u2"
          hasMore={false}
          isLoading={true}
          isFetchingMore={false}
          typingParticipants={[]}
          isGroup={false}
          onLoadMore={vi.fn()}
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    // Separator click test
    rerender(
      <QueryClientProvider client={queryClient}>
        <MessageList
          messages={[
            {
              id: 'm1',
              conversationId: 'c1',
              sender: { id: 'u1', username: 'u1', displayName: 'U1', avatar: null },
              body: 'msg',
              createdAt: '2026-01-01',
              reactions: [],
              attachments: [],
              readBy: [],
            } as any,
          ]}
          currentUserId="u1"
          otherParticipantId="u2"
          hasMore={false}
          isLoading={false}
          isFetchingMore={false}
          typingParticipants={[]}
          isGroup={false}
          onOpenDatePicker={onOpenDatePicker}
          onLoadMore={vi.fn()}
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const dateBtn = screen.getByTitle('Click to open calendar date picker');
    fireEvent.click(dateBtn);
    expect(onOpenDatePicker).toHaveBeenCalled();
  });

  it('renders OlderMessagesSkeleton when isFetchingMore is true and handles ThemeProposalMessage', () => {
    const onResetToLive = vi.fn();
    const themeProposalMsg: any = {
      id: 'theme-msg-1',
      conversationId: 'c1',
      sender: { id: 'u2', username: 'u2', displayName: 'User 2', avatar: null },
      body: 'Theme proposal',
      messageType: 'THEME_PROPOSAL',
      createdAt: '2026-01-01',
      reactions: [],
      attachments: [],
      readBy: [],
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MessageList
          messages={[themeProposalMsg]}
          currentUserId="u1"
          otherParticipantId="u2"
          hasMore={true}
          isLoading={false}
          isFetchingMore={true}
          isAnchoredInHistory={true}
          onResetToLive={onResetToLive}
          typingParticipants={[]}
          isGroup={false}
          onLoadMore={vi.fn()}
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    // Scroll to bottom button when isAnchoredInHistory is true
    const scrollBtn = screen.getByTitle('Jump to live messages');
    fireEvent.click(scrollBtn);
    expect(onResetToLive).toHaveBeenCalled();
  });
});
