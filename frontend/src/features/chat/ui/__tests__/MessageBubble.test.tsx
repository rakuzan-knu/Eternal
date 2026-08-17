import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageBubble from '../MessageBubble';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MessageView } from '@/entities/chat/model/types';

describe('MessageBubble', () => {
  const queryClient = new QueryClient();

  const mockMessage: MessageView = {
    id: 'msg-1',
    conversationId: 'conv-1',
    body: 'Hello from the other side',
    messageType: 'TEXT',
    replyTo: null,
    forwardedFrom: null,
    readBy: [],
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    createdAt: new Date().toISOString(),
    editedAt: null,
    reactions: [],
    attachments: [],
    sender: {
      id: 'usr-1',
      username: 'alice',
      displayName: 'Alice',
      avatar: null,
    },
  };

  it('renders message text and time', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          showAvatar={true}
          isReadByOther={true}
          currentUserId="me"
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

    expect(screen.getByText('Hello from the other side')).toBeInTheDocument();
  });
});
