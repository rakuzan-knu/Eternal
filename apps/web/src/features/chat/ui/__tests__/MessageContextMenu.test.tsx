import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageContextMenu from '../MessageContextMenu';
import type { MessageView } from '@/entities/chat/model/types';
import React from 'react';

describe('MessageContextMenu', () => {
  const mockMessage: MessageView = {
    id: 'msg-1',
    conversationId: 'conv-1',
    body: 'Hello world',
    messageType: 'TEXT',
    replyTo: null,
    forwardedFrom: null,
    readBy: ['other'],
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    createdAt: new Date().toISOString(),
    editedAt: null,
    reactions: [],
    attachments: [],
    status: 'READ',
    sender: {
      id: 'me',
      username: 'me',
      displayName: 'Me',
      avatar: null,
    },
  };

  it('renders Telegram-style menu with reactions bar, status header and all action buttons for own message', () => {
    const onClose = vi.fn();
    const onReply = vi.fn();
    const onEdit = vi.fn();
    const onTogglePin = vi.fn();
    const onForward = vi.fn();
    const onDelete = vi.fn();
    const onSelect = vi.fn();
    const onReact = vi.fn();
    const onOpenFullPicker = vi.fn();

    const writeTextSpy = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    render(
      <MessageContextMenu
        message={mockMessage}
        isOwnMessage={true}
        isReadByOther={true}
        onClose={onClose}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onForward={onForward}
        onTogglePin={onTogglePin}
        onReport={vi.fn()}
        onSelectMessage={onSelect}
        onReact={onReact}
        onOpenFullPicker={onOpenFullPicker}
        coords={{ x: 300, y: 400 }}
      />,
    );

    // 1. Reactions bar
    expect(screen.getByTestId('context-menu-reactions')).toBeInTheDocument();
    const heartBtn = screen.getByTitle('React with ❤️');
    expect(heartBtn).toBeInTheDocument();
    fireEvent.click(heartBtn);
    expect(onReact).toHaveBeenCalledWith('❤️', expect.any(Object));

    // 2. Status header with formatted date and Read badge
    expect(screen.getByText(/Today at/i)).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();

    // 3. Action buttons: Reply, Edit, Copy, Translate, Pin, Forward, Select, Delete
    expect(screen.getByText('Reply')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.getByText('Pin')).toBeInTheDocument();
    expect(screen.getByText('Forward')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    // Copy action
    fireEvent.click(screen.getByText('Copy'));
    expect(writeTextSpy).toHaveBeenCalledWith('Hello world');

    // Reply action
    fireEvent.click(screen.getByText('Reply'));
    expect(onReply).toHaveBeenCalled();

    // Edit action
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalled();

    // Pin action
    fireEvent.click(screen.getByText('Pin'));
    expect(onTogglePin).toHaveBeenCalled();

    // Forward action
    fireEvent.click(screen.getByText('Forward'));
    expect(onForward).toHaveBeenCalled();

    // Select action
    fireEvent.click(screen.getByText('Select'));
    expect(onSelect).toHaveBeenCalled();

    // Delete action
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('hides Edit button and shows Report button for messages from another user', () => {
    const onReport = vi.fn();
    const otherMessage: MessageView = {
      ...mockMessage,
      isPinned: true,
      body: 'Message from someone else',
      status: 'SENT',
      sender: {
        id: 'other',
        username: 'alice',
        displayName: 'Alice',
        avatar: null,
      },
    };

    render(
      <MessageContextMenu
        message={otherMessage}
        isOwnMessage={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onForward={vi.fn()}
        onTogglePin={vi.fn()}
        onReport={onReport}
        onSelectMessage={vi.fn()}
      />,
    );

    // Edit should NOT be in the document
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();

    // Unpin and Report should be present
    expect(screen.getByText('Unpin')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Report'));
    expect(onReport).toHaveBeenCalled();
  });

  it('closes smoothly on Escape key', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <MessageContextMenu
        message={mockMessage}
        isOwnMessage={true}
        onClose={onClose}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onForward={vi.fn()}
        onTogglePin={vi.fn()}
        onReport={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    vi.advanceTimersByTime(150);

    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('closes smoothly when clicking the backdrop', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <MessageContextMenu
        message={mockMessage}
        isOwnMessage={true}
        onClose={onClose}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onForward={vi.fn()}
        onTogglePin={vi.fn()}
        onReport={vi.fn()}
      />,
    );

    const backdrop = screen.getByTestId('context-menu-backdrop');
    fireEvent.click(backdrop);
    vi.advanceTimersByTime(150);

    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('closes context menu and calls onOpenExpandedPicker when expanding reaction dock', () => {
    const onClose = vi.fn();
    const onOpenExpandedPicker = vi.fn();

    render(
      <MessageContextMenu
        message={mockMessage}
        isOwnMessage={true}
        onClose={onClose}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onForward={vi.fn()}
        onTogglePin={vi.fn()}
        onReport={vi.fn()}
        onReact={vi.fn()}
        onOpenExpandedPicker={onOpenExpandedPicker}
      />,
    );

    const expandBtn = screen.getByTitle('All reactions');
    expect(expandBtn).toBeInTheDocument();
    fireEvent.click(expandBtn);

    expect(onClose).toHaveBeenCalled();
    expect(onOpenExpandedPicker).toHaveBeenCalledWith(expect.any(Object));
  });

  it('renders Copy Media and Download buttons when message has an image attachment', () => {
    const onClose = vi.fn();
    const mediaMessage: MessageView = {
      ...mockMessage,
      attachments: [
        {
          id: 'att-1',
          type: 'IMAGE',
          url: 'https://example.com/test.png',
          fileName: 'test.png',
          mimeType: 'image/png',
          size: 1024,
          width: 800,
          height: 600,
          duration: null,
          thumbnailUrl: null,
        },
      ],
    };

    render(
      <MessageContextMenu
        message={mediaMessage}
        isOwnMessage={true}
        onClose={onClose}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onForward={vi.fn()}
        onTogglePin={vi.fn()}
        onReport={vi.fn()}
      />,
    );

    expect(screen.getByText('Copy Media')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });
});
