import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SystemMessageCluster from '../SystemMessageCluster';
import { MessageView } from '@/entities/chat/model/types';
import React from 'react';

describe('SystemMessageCluster', () => {
  const mockSingleMessage: MessageView = {
    id: 'sys-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    sender: {
      id: 'user-1',
      username: 'ayate',
      displayName: 'Ayate',
      avatar: null,
      isVerified: false,
    },
    messageType: 'SYSTEM',
    type: 'SYSTEM',
    body: 'User Ayate updated the group icon',
    attachments: [],
    reactions: [],
    replyTo: null,
    forwardedFrom: null,
    isEdited: false,
    isPinned: false,
    readBy: [],
    editedAt: null,
    isDeleted: false,
    createdAt: '2026-08-18T20:33:00.000Z',
  };

  const mockClusterMessages: MessageView[] = [
    mockSingleMessage,
    {
      id: 'sys-2',
      conversationId: 'conv-1',
      senderId: 'user-1',
      sender: {
        id: 'user-1',
        username: 'ayate',
        displayName: 'Ayate',
        avatar: null,
        isVerified: false,
      },
      messageType: 'SYSTEM',
      type: 'SYSTEM',
      body: 'User Ayate changed the group name to "Rakuzan"',
      attachments: [],
      reactions: [],
      replyTo: null,
      forwardedFrom: null,
      isEdited: false,
      isPinned: false,
      readBy: [],
      editedAt: null,
      isDeleted: false,
      createdAt: '2026-08-18T20:34:00.000Z',
    },
    {
      id: 'sys-3',
      conversationId: 'conv-1',
      senderId: 'user-2',
      sender: {
        id: 'user-2',
        username: 'alice',
        displayName: 'Alice',
        avatar: 'https://example.com/alice.png',
        isVerified: false,
      },
      messageType: 'SYSTEM',
      type: 'SYSTEM',
      body: 'User Alice joined the group',
      attachments: [],
      reactions: [],
      replyTo: null,
      forwardedFrom: null,
      isEdited: false,
      isPinned: false,
      readBy: [],
      editedAt: null,
      isDeleted: false,
      createdAt: '2026-08-18T20:35:00.000Z',
    },
  ];

  it('renders single system message as a standard pill and dispatches event if no callback', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<SystemMessageCluster messages={[mockSingleMessage]} />);

    expect(screen.getByText('User Ayate updated the group icon')).toBeInTheDocument();
    const editBtn = screen.getByText('Edit group');
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
  });

  it('renders collapsed cluster capsule with accurate pluralization and expands on click', () => {
    const handleEdit = vi.fn();
    render(<SystemMessageCluster messages={mockClusterMessages} onOpenEditGroup={handleEdit} />);

    // 3 events -> "3 group changes"
    expect(screen.getByText('3 group changes')).toBeInTheDocument();

    const toggle = screen.getByTestId('system-message-cluster-toggle');
    fireEvent.click(toggle);

    // After expansion, individual events are shown
    expect(screen.getByText('User Ayate updated the group icon')).toBeInTheDocument();
    expect(screen.getByText('User Ayate changed the group name to "Rakuzan"')).toBeInTheDocument();
    expect(screen.getByText('User Alice joined the group')).toBeInTheDocument();

    // Click Edit inside expanded item
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(editButtons[0]);
    expect(handleEdit).toHaveBeenCalled();
  });

  it('renders leave group message as centered plain gray text without background', () => {
    const leaveMessage: MessageView = {
      ...mockSingleMessage,
      id: 'sys-leave-1',
      body: 'Ayate left the group',
    };

    render(<SystemMessageCluster messages={[leaveMessage]} />);

    const leaveText = screen.getByText('Ayate left the group');
    expect(leaveText).toBeInTheDocument();
    expect(screen.queryByText('Edit group')).not.toBeInTheDocument();
  });

  it('dispatches open-edit-group event when clicking Edit inside expanded cluster without callback', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<SystemMessageCluster messages={mockClusterMessages} />);

    const toggle = screen.getByTestId('system-message-cluster-toggle');
    fireEvent.click(toggle);

    const editBtns = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(editBtns[0]);

    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
  });
});
