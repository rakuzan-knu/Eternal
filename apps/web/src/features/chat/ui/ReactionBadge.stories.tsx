import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ReactionBadge from './ReactionBadge';
import type { ReactionSummary } from '@/entities/chat/model/types';
import ReactionBurstCanvas from './ReactionBurstCanvas';

function ReactionBadgeStoryWrapper() {
  const [reaction, setReaction] = useState<ReactionSummary>({
    emoji: '❤️',
    count: 3,
    selfReacted: false,
    users: [
      {
        id: 'usr-1',
        username: 'alice',
        displayName: 'Alice',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      },
      {
        id: 'usr-2',
        username: 'bob',
        displayName: 'Bob',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      },
      { id: 'usr-3', username: 'clara', displayName: 'Clara', avatar: null },
    ],
  });

  const handleToggle = (emoji: string, selfReacted: boolean) => {
    setReaction((prev) => ({
      ...prev,
      selfReacted: !selfReacted,
      count: selfReacted ? prev.count - 1 : prev.count + 1,
    }));
  };

  return (
    <div className="p-16 flex flex-col items-center gap-6 bg-[#070709] rounded-2xl min-h-[300px]">
      <ReactionBurstCanvas />
      <div className="text-sm text-gray-400">
        Telegram-style reaction badge (Click to toggle, hover 300ms for user list):
      </div>
      <div className="flex items-center gap-3">
        <ReactionBadge reaction={reaction} currentUserId="usr-me" onToggle={handleToggle} />
        <ReactionBadge
          reaction={{
            emoji: '🔥',
            count: 7,
            selfReacted: true,
            users: [
              { id: 'usr-me', username: 'me', displayName: 'You', avatar: null },
              { id: 'usr-4', username: 'david', displayName: 'David', avatar: null },
            ],
          }}
          currentUserId="usr-me"
          onToggle={handleToggle}
        />
      </div>
    </div>
  );
}

const meta: Meta<typeof ReactionBadge> = {
  title: 'Features/Chat/ReactionBadge',
  component: ReactionBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ReactionBadge>;

export const Default: Story = {
  render: () => <ReactionBadgeStoryWrapper />,
};
