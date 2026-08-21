import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import NicknamesModal from './NicknamesModal';
import { ConversationView } from '../../../entities/chat/model/types';

const sampleConversation: ConversationView = {
  id: 'conv-1',
  participants: [
    {
      id: 'p1',
      userId: 'u1',
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
      user: {
        id: 'u2',
        username: 'marcus',
        displayName: 'Marcus Vance',
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      },
    },
  ],
} as unknown as ConversationView;

function NicknamesModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Edit Nicknames
      </button>

      {isOpen && (
        <NicknamesModal conversation={sampleConversation} onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
}

const meta: Meta<typeof NicknamesModal> = {
  title: 'Features/Chat/NicknamesModal',
  component: NicknamesModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof NicknamesModal>;

export const Default: Story = {
  render: () => <NicknamesModalStoryWrapper />,
};
