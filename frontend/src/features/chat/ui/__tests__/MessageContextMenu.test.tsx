import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageContextMenu from '../MessageContextMenu';
import type { MessageView } from '@/entities/chat/model/types';

describe('MessageContextMenu', () => {
  const mockMessage: MessageView = {
    id: 'msg-1',
    conversationId: 'conv-1',
    body: 'Hello',
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
      id: 'me',
      username: 'me',
      displayName: 'Me',
      avatar: null,
    },
  };

  it('renders edit and delete menu items for own message', () => {
    render(
      <MessageContextMenu
        message={mockMessage}
        isOwnMessage={true}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onForward={vi.fn()}
        onTogglePin={vi.fn()}
        onReport={vi.fn()}
      />,
    );

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Forward')).toBeInTheDocument();
  });
});
