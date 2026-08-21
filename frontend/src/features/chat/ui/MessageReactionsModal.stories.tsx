import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import MessageReactionsModal from './MessageReactionsModal';
import { ReactionSummary } from '../../../entities/chat/model/types';

const sampleReactions: ReactionSummary[] = [
  {
    emoji: '🔥',
    count: 2,
    userIds: ['u1', 'u2'],
    users: [
      {
        id: 'u1',
        username: 'elena',
        displayName: 'Elena Rostova',
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      },
      {
        id: 'u2',
        username: 'marcus',
        displayName: 'Marcus Vance',
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    emoji: '❤️',
    count: 1,
    userIds: ['u3'],
    users: [
      {
        id: 'u3',
        username: 'alex',
        displayName: 'Alex Carter',
        avatar:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      },
    ],
  },
] as unknown as ReactionSummary[];

function MessageReactionsModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        View Reactions
      </button>

      {isOpen && (
        <MessageReactionsModal
          reactions={sampleReactions}
          currentUserId="u1"
          onClose={() => setIsOpen(false)}
          onRemoveOwn={(emoji) => console.log('Remove reaction:', emoji)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof MessageReactionsModal> = {
  title: 'Features/Chat/MessageReactionsModal',
  component: MessageReactionsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MessageReactionsModal>;

export const Default: Story = {
  render: () => <MessageReactionsModalStoryWrapper />,
};
