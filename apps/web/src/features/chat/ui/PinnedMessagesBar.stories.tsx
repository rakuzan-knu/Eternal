import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import PinnedMessagesBar from './PinnedMessagesBar';
import { MessageView } from '@/entities/chat/model/types';

const mockPinned = [
  {
    id: 'pin-1',
    conversationId: 'conv-1',
    messageType: 'TEXT',
    body: '🔥 Welcome to the team! Please check out the onboarding documentation.',
    createdAt: '2026-08-20T10:00:00Z',
    editedAt: null,
    replyTo: null,
    sender: { id: 'u1', username: 'lead', displayName: 'Tech Lead', avatar: null },
    attachments: [],
    reactions: [],
  },
  {
    id: 'pin-2',
    conversationId: 'conv-1',
    messageType: 'TEXT',
    body: 'Deployment scheduled for 18:00 UTC today.',
    createdAt: '2026-08-21T08:30:00Z',
    editedAt: null,
    replyTo: null,
    sender: { id: 'u2', username: 'devops', displayName: 'Release Bot', avatar: null },
    attachments: [],
    reactions: [],
  },
] as unknown as MessageView[];

const meta: Meta<typeof PinnedMessagesBar> = {
  title: 'Features/Chat/PinnedMessagesBar',
  component: PinnedMessagesBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[450px] max-w-full rounded-2xl overflow-hidden border border-white/10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PinnedMessagesBar>;

export const SinglePinned: Story = {
  args: {
    pinnedMessages: [mockPinned[0]],
    onJumpToMessage: (id) => console.log('Jump to:', id),
    onUnpin: (id) => console.log('Unpin:', id),
    onOpenAllPinned: () => console.log('Open all'),
  },
};

export const MultiplePinned: Story = {
  args: {
    pinnedMessages: mockPinned,
    onJumpToMessage: (id) => console.log('Jump to:', id),
    onUnpin: (id) => console.log('Unpin:', id),
    onOpenAllPinned: () => console.log('Open all'),
  },
};
