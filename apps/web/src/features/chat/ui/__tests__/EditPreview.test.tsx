import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EditPreview from '../EditPreview';
import type { MessageView } from '@/entities/chat/model/types';

describe('EditPreview', () => {
  const mockMessage: MessageView = {
    id: 'msg-1',
    conversationId: 'conv-1',
    body: 'и фри подписка',
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
      username: 'ayate',
      displayName: 'Ayate',
      avatar: null,
    },
  };

  it('renders Editing header, message text preview and triggers onCancel', () => {
    const onCancel = vi.fn();
    render(<EditPreview message={mockMessage} onCancel={onCancel} />);

    expect(screen.getByText('Editing')).toBeInTheDocument();
    expect(screen.getByText('и фри подписка')).toBeInTheDocument();

    const cancelBtn = screen.getByTitle('Cancel edit (Esc)');
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('handles jump to message scroll on container click', () => {
    const originalEl = document.createElement('div');
    originalEl.id = 'msg-msg-1';
    originalEl.scrollIntoView = vi.fn();
    document.body.appendChild(originalEl);

    render(<EditPreview message={mockMessage} onCancel={vi.fn()} />);

    const container = screen.getByTitle('Jump to message');
    fireEvent.click(container);

    expect(originalEl.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    document.body.removeChild(originalEl);
  });

  it('renders photo and file attachment previews', () => {
    const photoMessage: MessageView = {
      ...mockMessage,
      body: 'look at this',
      attachments: [
        {
          id: 'att-1',
          type: 'IMAGE',
          url: 'https://example.com/pic.jpg',
          fileName: 'pic.jpg',
        } as any,
      ],
    };

    const { rerender } = render(<EditPreview message={photoMessage} onCancel={vi.fn()} />);
    expect(screen.getByText('Photo, look at this')).toBeInTheDocument();

    const fileMessage: MessageView = {
      ...mockMessage,
      body: '',
      attachments: [
        {
          id: 'att-2',
          type: 'FILE',
          url: 'https://example.com/sheet.xlsx',
          fileName: 'sheet.xlsx',
        } as any,
      ],
    };

    rerender(<EditPreview message={fileMessage} onCancel={vi.fn()} />);
    expect(screen.getByText('📄 sheet.xlsx')).toBeInTheDocument();
  });
});
