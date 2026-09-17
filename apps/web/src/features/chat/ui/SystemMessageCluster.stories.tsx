import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import SystemMessageCluster from './SystemMessageCluster';
import { MessageView } from '@/entities/chat/model/types';

const singleSystemMsg = [
  {
    id: 'sys-1',
    conversationId: 'conv-1',
    messageType: 'SYSTEM',
    body: 'Elena Rostova changed the group name to "Frontend Architecture"',
    createdAt: '2026-08-21T11:00:00Z',
    editedAt: null,
    replyTo: null,
    sender: {
      id: 'u1',
      username: 'elena',
      displayName: 'Elena Rostova',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    attachments: [],
    reactions: [],
  },
] as unknown as MessageView[];

const clusterSystemMsgs = [
  singleSystemMsg[0],
  {
    id: 'sys-2',
    conversationId: 'conv-1',
    messageType: 'SYSTEM',
    body: 'Marcus Vance updated the group icon',
    createdAt: '2026-08-21T11:05:00Z',
    editedAt: null,
    replyTo: null,
    sender: {
      id: 'u2',
      username: 'marcus',
      displayName: 'Marcus Vance',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
    attachments: [],
    reactions: [],
  },
  {
    id: 'sys-3',
    conversationId: 'conv-1',
    messageType: 'SYSTEM',
    body: 'Alex Carter added @developer to the group',
    createdAt: '2026-08-21T11:10:00Z',
    editedAt: null,
    replyTo: null,
    sender: {
      id: 'u3',
      username: 'alex',
      displayName: 'Alex Carter',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    },
    attachments: [],
    reactions: [],
  },
] as unknown as MessageView[];

const meta: Meta<typeof SystemMessageCluster> = {
  title: 'Features/Chat/SystemMessageCluster',
  component: SystemMessageCluster,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] max-w-full p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SystemMessageCluster>;

export const SingleEvent: Story = {
  args: {
    messages: singleSystemMsg,
    onOpenEditGroup: () => console.log('Edit group click'),
  },
};

export const ClusteredEvents: Story = {
  args: {
    messages: clusterSystemMsgs,
    onOpenEditGroup: () => console.log('Edit group click'),
  },
};
