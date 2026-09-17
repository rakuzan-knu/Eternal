import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import AdminPermissionsModal from './AdminPermissionsModal';
import { ConversationParticipantView } from '@/entities/chat/model/types';

const sampleAdmin: ConversationParticipantView = {
  id: 'part-2',
  conversationId: 'conv-1',
  userId: 'u-marcus',
  role: 'ADMIN',
  joinedAt: '2026-01-01T00:00:00Z',
  user: {
    id: 'u-marcus',
    username: 'marcus',
    displayName: 'Marcus Vance',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
} as unknown as ConversationParticipantView;

function AdminPermissionsModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Admin Permissions
      </button>

      <AdminPermissionsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        conversationId="conv-1"
        adminParticipant={sampleAdmin}
        initialPermissions={{
          canEditGroup: true,
          canDeleteMessages: true,
          canManageMembers: false,
          canPinMessages: true,
          canInviteUsers: true,
        }}
      />
    </div>
  );
}

const meta: Meta<typeof AdminPermissionsModal> = {
  title: 'Features/Chat/AdminPermissionsModal',
  component: AdminPermissionsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AdminPermissionsModal>;

export const Default: Story = {
  render: () => <AdminPermissionsModalStoryWrapper />,
};
