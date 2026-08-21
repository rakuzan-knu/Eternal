import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders pinned messages list and handles jump to message and unpin', () => {
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

    const jumpBtn = screen.getByText('Important announcement');
    fireEvent.click(jumpBtn);
    expect(onJumpToMessage).toHaveBeenCalledWith('pin-1');

    const unpinBtn = screen.getByTitle('Unpin');
    fireEvent.click(unpinBtn);
    expect(onUnpin).toHaveBeenCalledWith('pin-1');
  });
});
