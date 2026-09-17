import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ChatItemMenu from './ChatItemMenu';
import { ConversationView } from '../../../entities/chat/model/types';

const sampleConversation: ConversationView = {
  id: 'conv-1',
  name: 'Elena Rostova',
  isGroup: false,
  isArchived: false,
  isMuted: false,
  isPinned: false,
  participants: [],
} as unknown as ConversationView;

function ChatItemMenuStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-20 relative h-[360px] flex items-center justify-center">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Chat Item Menu
      </button>

      {isOpen && (
        <ChatItemMenu
          conversation={sampleConversation}
          otherUserId="u-elena"
          otherUsername="elena"
          conversationTitle="Elena Rostova"
          avatarUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
          isPinnedLocally={false}
          isForcedUnread={false}
          onClose={() => setIsOpen(false)}
          onTogglePinLocally={(id) => console.log('Pin locally:', id)}
          onToggleUnreadLocally={(id) => console.log('Unread locally:', id)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof ChatItemMenu> = {
  title: 'Features/Chat/ChatItemMenu',
  component: ChatItemMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ChatItemMenu>;

export const Default: Story = {
  render: () => <ChatItemMenuStoryWrapper />,
};
