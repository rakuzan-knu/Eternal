import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import GroupParticipantsModal from './GroupParticipantsModal';
import { ConversationView } from '../../../entities/chat/model/types';

const sampleGroup: ConversationView = {
  id: 'conv-1',
  name: 'Engineering Team',
  isGroup: true,
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

function GroupParticipantsModalStoryWrapper({
  roleFilter = 'ALL',
}: {
  roleFilter?: 'ADMINS' | 'ALL';
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        View Group Participants
      </button>

      {isOpen && (
        <GroupParticipantsModal
          conversation={sampleGroup}
          currentUserId="u1"
          roleFilter={roleFilter}
          onClose={() => setIsOpen(false)}
          onSelectMember={(userId) => console.log('Selected member:', userId)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof GroupParticipantsModal> = {
  title: 'Features/Chat/GroupParticipantsModal',
  component: GroupParticipantsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof GroupParticipantsModal>;

export const AllParticipants: Story = {
  render: () => <GroupParticipantsModalStoryWrapper roleFilter="ALL" />,
};

export const AdminsOnly: Story = {
  render: () => <GroupParticipantsModalStoryWrapper roleFilter="ADMINS" />,
};
