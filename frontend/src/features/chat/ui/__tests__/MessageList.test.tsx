import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageList from '../MessageList';
import { MessageView } from '@/entities/chat/model/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({
    data,
    itemContent,
  }: {
    data: Array<{ key: string; [key: string]: unknown }>;
    itemContent: (i: number, d: unknown) => React.ReactNode;
  }) => (
    <div data-testid="virtuoso-mock">
      {data.map((item, idx) => (
        <div key={item.key || idx}>{itemContent(idx, item)}</div>
      ))}
    </div>
  ),
}));

describe('MessageList', () => {
  const queryClient = new QueryClient();

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

  it('renders messages using virtuoso component', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        conversationId: 'c1',
        senderId: 'u1',
        sender: { id: 'u1', username: 'u1', displayName: 'User One', avatar: null },
        body: 'Hello from virtuoso test',
        createdAt: '2026-01-01T12:00:00Z',
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

    expect(screen.getByText('Hello from virtuoso test')).toBeInTheDocument();
  });
});
