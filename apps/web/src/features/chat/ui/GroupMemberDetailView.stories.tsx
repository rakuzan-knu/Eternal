import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import GroupMemberDetailView from './GroupMemberDetailView';
import { ConversationView, ParticipantView } from '../../../entities/chat/model/types';

const sampleConversation: ConversationView = {
  id: 'conv-1',
  name: 'TypeScript Masters',
  isGroup: true,
  participants: [],
} as unknown as ConversationView;

const sampleMember: ParticipantView = {
  id: 'p-1',
  userId: 'u-1',
  role: 'MEMBER',
  joinedAt: '2026-02-01T12:00:00Z',
  user: {
    id: 'u-1',
    username: 'alex',
    displayName: 'Alex Carter',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    bio: 'Fullstack developer & open source enthusiast',
  },
} as unknown as ParticipantView;

const sampleAdminMember: ParticipantView = {
  ...sampleMember,
  role: 'ADMIN',
};

const meta: Meta<typeof GroupMemberDetailView> = {
  title: 'Features/Chat/GroupMemberDetailView',
  component: GroupMemberDetailView,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[360px] max-w-full bg-[#181926] border border-white/10 rounded-3xl p-5 shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GroupMemberDetailView>;

export const RegularMember: Story = {
  args: {
    conversation: sampleConversation,
    participant: sampleMember,
    canManage: true,
    onBack: () => console.log('Back clicked'),
  },
};

export const AdminMember: Story = {
  args: {
    conversation: sampleConversation,
    participant: sampleAdminMember,
    canManage: true,
    onBack: () => console.log('Back clicked'),
  },
};
