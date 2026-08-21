import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import GroupMembersSection from './GroupMembersSection';
import { ConversationView } from '../../../../entities/chat/model/types';

const sampleConversation: ConversationView = {
  id: 'conv-1',
  participants: [
    {
      id: 'p1',
      userId: 'u1',
      role: 'OWNER',
      user: {
        id: 'u1',
        username: 'elena',
        displayName: 'Elena Rostova',
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      },
    },
    {
      id: 'p2',
      userId: 'u2',
      role: 'ADMIN',
      user: {
        id: 'u2',
        username: 'marcus',
        displayName: 'Marcus Vance',
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      },
    },
    {
      id: 'p3',
      userId: 'u3',
      role: 'MEMBER',
      user: {
        id: 'u3',
        username: 'alex',
        displayName: 'Alex Carter',
        avatar:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      },
    },
  ],
} as unknown as ConversationView;

const meta: Meta<typeof GroupMembersSection> = {
  title: 'Features/Chat/Details/GroupMembersSection',
  component: GroupMembersSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px] max-w-full bg-[#181926] border border-white/10 rounded-2xl p-3 shadow-xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GroupMembersSection>;

export const Default: Story = {
  args: {
    conversation: sampleConversation,
    onAddMembers: () => console.log('Add members'),
    onSelectMember: (id) => console.log('Select member:', id),
    onViewAll: () => console.log('View all members'),
  },
};
