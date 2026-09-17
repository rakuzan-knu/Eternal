import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import PinnedMessagesModal from './PinnedMessagesModal';
import { MessageView } from '../../../entities/chat/model/types';

const samplePinnedMessages: MessageView[] = [
  {
    id: 'msg-p1',
    conversationId: 'conv-1',
    body: '📌 Rules for the group: Be respectful, share code examples, and enjoy coding!',
    createdAt: '2026-08-15T09:00:00Z',
    sender: {
      id: 'u1',
      username: 'elena',
      displayName: 'Elena Rostova',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'msg-p2',
    conversationId: 'conv-1',
    body: 'Link to our sprint board: https://linear.app/team-social',
    createdAt: '2026-08-18T14:20:00Z',
    sender: {
      id: 'u2',
      username: 'marcus',
      displayName: 'Marcus Vance',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
  },
] as unknown as MessageView[];

function PinnedMessagesModalStoryWrapper({ empty = false }: { empty?: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        View Pinned Messages
      </button>

      {isOpen && (
        <PinnedMessagesModal
          pinnedMessages={empty ? [] : samplePinnedMessages}
          onClose={() => setIsOpen(false)}
          onJumpToMessage={(id) => console.log('Jump to message:', id)}
          onUnpin={(id) => console.log('Unpin message:', id)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof PinnedMessagesModal> = {
  title: 'Features/Chat/PinnedMessagesModal',
  component: PinnedMessagesModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PinnedMessagesModal>;

export const WithMessages: Story = {
  render: () => <PinnedMessagesModalStoryWrapper empty={false} />,
};

export const EmptyState: Story = {
  render: () => <PinnedMessagesModalStoryWrapper empty={true} />,
};
