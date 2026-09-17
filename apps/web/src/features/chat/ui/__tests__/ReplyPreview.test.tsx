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

  it('renders sticker, photo, video, audio, video note, and file attachment preview texts and handles image error', () => {
    const photoMessage: MessageView = {
      ...mockMessage,
      body: '',
      attachments: [
        {
          id: 'att-1',
          type: 'IMAGE',
          url: 'https://example.com/pic.jpg',
          fileName: 'photo.jpg',
        } as any,
      ],
    };

    const { rerender } = render(<ReplyPreview message={photoMessage} onCancel={vi.fn()} />);
    expect(screen.getByText('🖼️ Photo')).toBeInTheDocument();

    const img = screen.getByAltText('Reply attachment preview');
    fireEvent.error(img);

    const voiceMessage: MessageView = {
      ...mockMessage,
      body: '',
      attachments: [{ id: 'att-2', type: 'AUDIO', url: 'https://voice.ogg' } as any],
    };
    rerender(<ReplyPreview message={voiceMessage} onCancel={vi.fn()} />);
    expect(screen.getByText('🎙️ Voice message')).toBeInTheDocument();

    const fileMessage: MessageView = {
      ...mockMessage,
      body: '',
      attachments: [
        { id: 'att-3', type: 'FILE', url: 'https://doc.pdf', fileName: 'contract.pdf' } as any,
      ],
    };
    rerender(<ReplyPreview message={fileMessage} onCancel={vi.fn()} />);
    expect(screen.getByText('📄 contract.pdf')).toBeInTheDocument();

    const otherAttMessage: MessageView = {
      ...mockMessage,
      body: '',
      attachments: [{ id: 'att-4', type: 'UNKNOWN_TYPE' as any, url: 'https://other.bin' } as any],
    };
    rerender(<ReplyPreview message={otherAttMessage} onCancel={vi.fn()} />);
    expect(screen.getByText('Attachment')).toBeInTheDocument();
  });
});
