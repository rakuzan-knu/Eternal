import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import MessageBubble from './MessageBubble';
import { MessageView } from '../../../entities/chat/model/types';

const sampleIncomingMessage: MessageView = {
  id: 'msg-in-1',
  conversationId: 'conv-1',
  body: 'Hey! The new release looks absolutely stunning. The animations are so smooth! 🚀✨',
  createdAt: '2026-08-21T14:30:00Z',
  editedAt: null,
  isPinned: false,
  senderId: 'user-elena',
  sender: {
    id: 'user-elena',
    username: 'elena',
    displayName: 'Elena Rostova',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  reactions: [
    { emoji: '🔥', count: 3, userIds: ['user-1', 'user-2', 'user-3'] },
    { emoji: '❤️', count: 1, userIds: ['user-1'] },
  ],
  attachments: [],
} as unknown as MessageView;

const sampleOutgoingMessage: MessageView = {
  id: 'msg-out-1',
  conversationId: 'conv-1',
  body: 'Thank you! We put a lot of effort into making every single interaction feel instantaneous.',
  createdAt: '2026-08-21T14:31:00Z',
  editedAt: null,
  isPinned: false,
  senderId: 'current-user',
  sender: {
    id: 'current-user',
    username: 'myself',
    displayName: 'Myself',
    avatar: null,
  },
  reactions: [],
  attachments: [],
} as unknown as MessageView;

const meta: Meta<typeof MessageBubble> = {
  title: 'Features/Chat/MessageBubble',
  component: MessageBubble,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] max-w-full p-6 bg-[#0e0f14] border border-neutral-800 rounded-3xl flex flex-col gap-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageBubble>;

export const Incoming: Story = {
  args: {
    message: sampleIncomingMessage,
    isOwnMessage: false,
    showAvatar: true,
    isReadByOther: true,
    currentUserId: 'current-user',
    onReply: (m) => console.log('Reply:', m),
    onEdit: (m) => console.log('Edit:', m),
    onDelete: (id, forAll) => console.log('Delete:', id, forAll),
    onForward: (m) => console.log('Forward:', m),
    onTogglePin: (m) => console.log('Toggle pin:', m),
    onReport: (m) => console.log('Report:', m),
    onReact: (id, emoji) => console.log('React:', id, emoji),
    onUnreact: (id, emoji) => console.log('Unreact:', id, emoji),
  },
};

export const Outgoing: Story = {
  args: {
    message: sampleOutgoingMessage,
    isOwnMessage: true,
    showAvatar: false,
    isReadByOther: true,
    currentUserId: 'current-user',
    onReply: (m) => console.log('Reply:', m),
    onEdit: (m) => console.log('Edit:', m),
    onDelete: (id, forAll) => console.log('Delete:', id, forAll),
    onForward: (m) => console.log('Forward:', m),
    onTogglePin: (m) => console.log('Toggle pin:', m),
    onReport: (m) => console.log('Report:', m),
    onReact: (id, emoji) => console.log('React:', id, emoji),
    onUnreact: (id, emoji) => console.log('Unreact:', id, emoji),
  },
};
