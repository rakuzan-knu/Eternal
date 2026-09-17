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

  it('renders menu items in correct order: Select, Edit, Pin, Forward, Copy, Delete', () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    const onTogglePin = vi.fn();
    const onForward = vi.fn();
    const onDelete = vi.fn();

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
        onClose={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
        onForward={onForward}
        onTogglePin={onTogglePin}
        onReport={vi.fn()}
        onSelectMessage={onSelect}
      />,
    );

    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => b.textContent);

    expect(labels).toEqual(['Select', 'Edit', 'Pin', 'Forward', 'Copy message text', 'Delete']);

    const copyBtn = screen.getByText('Copy message text');
    fireEvent.click(copyBtn);
    expect(writeTextSpy).toHaveBeenCalledWith('Hello world');

    fireEvent.click(screen.getByText('Select'));
    expect(onSelect).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Pin'));
    expect(onTogglePin).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Forward'));
    expect(onForward).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('renders Unpin and Report for pinned message from another user without body', () => {
    const onReport = vi.fn();
    const otherMessage: MessageView = {
      ...mockMessage,
      isPinned: true,
      body: null as any,
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

    expect(screen.getByText('Unpin')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.queryByText('Copy message text')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Report'));
    expect(onReport).toHaveBeenCalled();
  });

  it('renders correctly without onSelectMessage', () => {
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

    expect(screen.queryByText('Select')).not.toBeInTheDocument();
  });
});
