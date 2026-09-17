import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ChatListItem from './ChatListItem';
import { ConversationView } from '@/entities/chat/model/types';

const mockDirectConv = {
  id: 'conv-1',
  type: 'DIRECT',
  name: null,
  avatar: null,
  description: null,
  createdById: null,
  unreadCount: 3,
  myMuteLevel: 'NONE',
  isArchived: false,
  isFavorite: false,
  isLocked: false,
  participants: [
    {
      userId: 'user-2',
      role: 'MEMBER',
      joinedAt: '2026-01-01T00:00:00Z',
      mutedUntil: null,
      nickname: null,
      theme: null,
      muteLevel: 'NONE',
      user: {
        id: 'user-2',
        username: 'elena',
        displayName: 'Elena Rostova',
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        isVerified: true,
      },
    },
  ],
  lastMessage: {
    id: 'msg-1',
    conversationId: 'conv-1',
    messageType: 'TEXT',
    body: 'Hey! Have you seen the new Storybook components update?',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    editedAt: null,
    replyTo: null,
    forwardedFrom: null,
    readBy: [],
    attachments: [],
    reactions: [],
    sender: {
      id: 'user-2',
      username: 'elena',
      displayName: 'Elena Rostova',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
  },
} as unknown as ConversationView;

const meta: Meta<typeof ChatListItem> = {
  title: 'Features/Chat/ChatListItem',
  component: ChatListItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[340px] max-w-full p-2 bg-[#121216] rounded-2xl border border-white/10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatListItem>;

export const DirectChatUnread: Story = {
  args: {
    conversation: mockDirectConv,
    currentUserId: 'my-user-id',
    isActive: false,
    isPinnedLocally: false,
    isForcedUnread: false,
    onSelect: (id) => console.log('Select conv', id),
    onTogglePinLocally: (id) => console.log('Pin conv', id),
    onToggleUnreadLocally: (id) => console.log('Toggle unread', id),
  },
};

export const ActiveChat: Story = {
  args: {
    conversation: mockDirectConv,
    currentUserId: 'my-user-id',
    isActive: true,
    isPinnedLocally: true,
    isForcedUnread: false,
    onSelect: (id) => console.log('Select conv', id),
    onTogglePinLocally: (id) => console.log('Pin conv', id),
    onToggleUnreadLocally: (id) => console.log('Toggle unread', id),
  },
};

export const MutedGroupChat: Story = {
  args: {
    conversation: {
      ...mockDirectConv,
      id: 'conv-group-1',
      type: 'GROUP',
      name: 'Frontend Core Architecture',
      myMuteLevel: 'MESSAGES_AND_CALLS',
      unreadCount: 0,
    },
    currentUserId: 'my-user-id',
    isActive: false,
    isPinnedLocally: false,
    isForcedUnread: false,
    onSelect: (id) => console.log('Select conv', id),
    onTogglePinLocally: (id) => console.log('Pin conv', id),
    onToggleUnreadLocally: (id) => console.log('Toggle unread', id),
  },
};
