import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PinnedMessagesBar from '../PinnedMessagesBar';
import type { MessageView } from '@/entities/chat/model/types';
import React from 'react';

describe('PinnedMessagesBar', () => {
  const mockMessage1: MessageView = {
    id: 'msg-p1',
    conversationId: 'conv-1',
    body: 'First pinned message',
    messageType: 'TEXT',
    replyTo: null,
    forwardedFrom: null,
    attachments: [],
    reactions: [],
    readBy: [],
    isEdited: false,
    isDeleted: false,
    isPinned: true,
    createdAt: new Date().toISOString(),
    editedAt: null,
    sender: {
      id: 'usr-1',
      username: 'alice',
      displayName: 'Alice',
      avatar: null,
    },
  };

  const mockMessage2: MessageView = {
    id: 'msg-p2',
    conversationId: 'conv-1',
    body: 'Second pinned message',
    messageType: 'TEXT',
    replyTo: null,
    forwardedFrom: null,
    attachments: [],
    reactions: [],
    readBy: [],
    isEdited: false,
    isDeleted: false,
    isPinned: true,
    createdAt: new Date().toISOString(),
    editedAt: null,
    sender: {
      id: 'usr-2',
      username: 'bob',
      displayName: 'Bob',
      avatar: null,
    },
  };

  it('renders nothing when pinnedMessages array is empty', () => {
    const { container } = render(
      <PinnedMessagesBar
        pinnedMessages={[]}
        onJumpToMessage={vi.fn()}
        onUnpin={vi.fn()}
        onOpenAllPinned={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders single pinned message with unpin cross button', () => {
    const onJumpToMessage = vi.fn();
    const onUnpin = vi.fn();
    render(
      <PinnedMessagesBar
        pinnedMessages={[mockMessage1]}
        onJumpToMessage={onJumpToMessage}
        onUnpin={onUnpin}
        onOpenAllPinned={vi.fn()}
      />,
    );

    expect(screen.getByText('Pinned message')).toBeInTheDocument();
    expect(screen.getByText('First pinned message')).toBeInTheDocument();

    const jumpBtn = screen.getByText('First pinned message').closest('button')!;
    fireEvent.click(jumpBtn);
    expect(onJumpToMessage).toHaveBeenCalledWith('msg-p1');

    const unpinBtn = screen.getByTitle('Unpin message');
    fireEvent.click(unpinBtn);
    expect(onUnpin).toHaveBeenCalledWith('msg-p1');
  });

  it('renders multiple pinned messages with list button and cycling', () => {
    const onJumpToMessage = vi.fn();
    const onOpenAllPinned = vi.fn();
    render(
      <PinnedMessagesBar
        pinnedMessages={[mockMessage1, mockMessage2]}
        onJumpToMessage={onJumpToMessage}
        onUnpin={vi.fn()}
        onOpenAllPinned={onOpenAllPinned}
      />,
    );

    expect(screen.getByText('Pinned message #1')).toBeInTheDocument();
    expect(screen.getByText('First pinned message')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    const listBtn = screen.getByTitle('View all pinned messages');
    fireEvent.click(listBtn);
    expect(onOpenAllPinned).toHaveBeenCalled();

    // Click bar to advance
    const barBtn = screen.getByText('First pinned message').closest('button')!;
    fireEvent.click(barBtn);
    expect(onJumpToMessage).toHaveBeenCalledWith('msg-p1');

    expect(screen.getByText('Pinned message #2')).toBeInTheDocument();
    expect(screen.getByText('Second pinned message')).toBeInTheDocument();
  });

  it('renders poll and attachment preview labels for pinned messages without body', () => {
    const pollMsg: MessageView = {
      ...mockMessage1,
      id: 'msg-poll',
      body: JSON.stringify({ type: 'POLL', question: 'Favorite framework?' }),
    };

    const photoMsg: MessageView = {
      ...mockMessage1,
      id: 'msg-photo',
      body: '',
      attachments: [{ id: 'a1', type: 'IMAGE', url: 'https://pic.jpg' } as any],
    };

    const { rerender } = render(
      <PinnedMessagesBar
        pinnedMessages={[pollMsg]}
        onJumpToMessage={vi.fn()}
        onUnpin={vi.fn()}
        onOpenAllPinned={vi.fn()}
      />,
    );

    expect(screen.getByText('📊 Poll: Favorite framework?')).toBeInTheDocument();

    rerender(
      <PinnedMessagesBar
        pinnedMessages={[photoMsg]}
        onJumpToMessage={vi.fn()}
        onUnpin={vi.fn()}
        onOpenAllPinned={vi.fn()}
      />,
    );
    expect(screen.getByText('Photo')).toBeInTheDocument();

    const videoMsg: MessageView = {
      ...mockMessage1,
      id: 'msg-vid',
      body: '',
      attachments: [{ id: 'a2', type: 'VIDEO', url: 'https://vid.mp4' } as any],
    };

    rerender(
      <PinnedMessagesBar
        pinnedMessages={[videoMsg]}
        onJumpToMessage={vi.fn()}
        onUnpin={vi.fn()}
        onOpenAllPinned={vi.fn()}
      />,
    );
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(document.querySelector('video')).toBeInTheDocument();

    const voiceMsg: MessageView = {
      ...mockMessage1,
      id: 'msg-voice',
      body: '',
      attachments: [{ id: 'a3', type: 'AUDIO', url: 'https://audio.mp3' } as any],
    };
    rerender(
      <PinnedMessagesBar
        pinnedMessages={[voiceMsg]}
        onJumpToMessage={vi.fn()}
        onUnpin={vi.fn()}
        onOpenAllPinned={vi.fn()}
      />,
    );
    expect(screen.getByText('Voice message')).toBeInTheDocument();
  });
});
