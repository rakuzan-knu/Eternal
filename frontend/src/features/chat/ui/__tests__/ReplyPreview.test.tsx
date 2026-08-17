import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReplyPreview from '../ReplyPreview';
import type { MessageView } from '@/entities/chat/model/types';

describe('ReplyPreview', () => {
  const mockMessage: MessageView = {
    id: 'msg-1',
    conversationId: 'conv-1',
    body: 'Original message text',
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
      displayName: 'Alice Smith',
      avatar: null,
    },
  };

  it('renders sender name, message preview and triggers onCancel', () => {
    const onCancel = vi.fn();
    render(<ReplyPreview message={mockMessage} onCancel={onCancel} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Original message text')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button');
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });
});
