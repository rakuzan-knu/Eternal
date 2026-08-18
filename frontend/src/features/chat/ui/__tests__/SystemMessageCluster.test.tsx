import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SystemMessageCluster from '../SystemMessageCluster';
import { MessageView } from '@/entities/chat/model/types';

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
    body: 'Пользователь Ayate сменил значок группы',
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
      body: 'Пользователь Ayate сменил название группы на Rakuzan',
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
      body: 'Пользователь Alice присоединился к группе',
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

  it('renders single system message as a standard pill', () => {
    const handleEdit = vi.fn();
    render(<SystemMessageCluster messages={[mockSingleMessage]} onOpenEditGroup={handleEdit} />);

    expect(screen.getByText('Пользователь Ayate сменил значок группы')).toBeInTheDocument();
    const editBtn = screen.getByText('Редактировать группу');
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalled();
  });

  it('renders collapsed cluster capsule with accurate pluralization and expands on click', () => {
    render(<SystemMessageCluster messages={mockClusterMessages} />);

    // 3 events -> "3 изменения в группе"
    expect(screen.getByText('3 изменения в группе')).toBeInTheDocument();

    const toggle = screen.getByTestId('system-message-cluster-toggle');
    fireEvent.click(toggle);

    // After expansion, individual events are shown
    expect(screen.getByText('Пользователь Ayate сменил значок группы')).toBeInTheDocument();
    expect(
      screen.getByText('Пользователь Ayate сменил название группы на Rakuzan'),
    ).toBeInTheDocument();
    expect(screen.getByText('Пользователь Alice присоединился к группе')).toBeInTheDocument();
  });
});
