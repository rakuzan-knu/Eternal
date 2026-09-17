import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PinnedMessagesModal from '../PinnedMessagesModal';
import { MessageView } from '@/entities/chat/model/types';
import React from 'react';

describe('PinnedMessagesModal', () => {
  const pinnedMessages = [
    {
      id: 'pin-1',
      conversationId: 'c1',
      senderId: 'u1',
      sender: { id: 'u1', username: 'alice', displayName: 'Alice', avatar: null },
      body: 'Important announcement',
      createdAt: '2026-01-01',
      reactions: [],
      attachments: [],
      isPinned: true,
    } as unknown as MessageView,
  ];

  it('renders pinned messages list, handles unpin and jump to message', () => {
    const onClose = vi.fn();
    const onJumpToMessage = vi.fn();
    const onUnpin = vi.fn();

    render(
      <PinnedMessagesModal
        pinnedMessages={pinnedMessages}
        onClose={onClose}
        onJumpToMessage={onJumpToMessage}
        onUnpin={onUnpin}
      />,
    );

    expect(screen.getByText('Pinned messages')).toBeInTheDocument();
    expect(screen.getByText('Important announcement')).toBeInTheDocument();

    const unpinBtn = screen.getByTitle('Unpin');
    fireEvent.click(unpinBtn);
    expect(onUnpin).toHaveBeenCalledWith('pin-1');

    const jumpBtn = screen.getByText('Important announcement');
    fireEvent.click(jumpBtn);
    expect(onJumpToMessage).toHaveBeenCalledWith('pin-1');
  });

  it('handles close button click', async () => {
    const onClose = vi.fn();

    render(
      <PinnedMessagesModal
        pinnedMessages={pinnedMessages}
        onClose={onClose}
        onJumpToMessage={vi.fn()}
        onUnpin={vi.fn()}
      />,
    );

    const closeBtn = document.querySelector('button')!;
    fireEvent.click(closeBtn);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('renders empty state when there are no pinned messages', () => {
    render(
      <PinnedMessagesModal
        pinnedMessages={[]}
        onClose={vi.fn()}
        onJumpToMessage={vi.fn()}
        onUnpin={vi.fn()}
      />,
    );

    expect(screen.getByText('No pinned messages')).toBeInTheDocument();
    expect(
      screen.getByText('Pinned messages from this chat will show up here.'),
    ).toBeInTheDocument();
  });

  it('renders "Sent an attachment" when pinned message has no body but has attachments', () => {
    const attachmentPin: any = {
      id: 'pin-att',
      conversationId: 'c1',
      sender: { id: 'u2', username: 'bob', displayName: 'Bob', avatar: null },
      body: '',
      createdAt: '2026-01-01',
      reactions: [],
      attachments: [{ id: 'a1', type: 'IMAGE', url: 'img.jpg' }],
      isPinned: true,
    };

    render(
      <PinnedMessagesModal
        pinnedMessages={[attachmentPin]}
        onClose={vi.fn()}
        onJumpToMessage={vi.fn()}
        onUnpin={vi.fn()}
      />,
    );

    expect(screen.getByText('Sent an attachment')).toBeInTheDocument();
  });
});
