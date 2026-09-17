import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import EditGroupModal from './EditGroupModal';
import { ConversationView } from '../../../entities/chat/model/types';

const sampleGroupConversation: ConversationView = {
  id: 'conv-group-1',
  name: 'TypeScript & Architecture Enthusiasts',
  isGroup: true,
  avatar:
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
  participants: [
    {
      id: 'p1',
      userId: 'u1',
      role: 'OWNER',
      user: { id: 'u1', username: 'owner', displayName: 'Owner User', avatar: null },
    },
    {
      id: 'p2',
      userId: 'u2',
      role: 'ADMIN',
      user: { id: 'u2', username: 'marcus', displayName: 'Marcus Vance', avatar: null },
    },
  ],
} as unknown as ConversationView;

function EditGroupModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Edit Group Settings
      </button>

      {isOpen && (
        <EditGroupModal
          conversation={sampleGroupConversation}
          onClose={() => setIsOpen(false)}
          onOpenParticipants={() => console.log('Open participants')}
          onOpenAdmins={() => console.log('Open admins')}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof EditGroupModal> = {
  title: 'Features/Chat/EditGroupModal',
  component: EditGroupModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof EditGroupModal>;

export const Default: Story = {
  render: () => <EditGroupModalStoryWrapper />,
};
