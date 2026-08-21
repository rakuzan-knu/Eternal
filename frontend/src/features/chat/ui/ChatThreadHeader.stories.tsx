import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ChatThreadHeader from './ChatThreadHeader';
import { ConversationDisplay } from '../lib/getConversationDisplay';

const directDisplay: ConversationDisplay = {
  title: 'Elena Rostova',
  avatar:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  isGroup: false,
  otherUserId: 'u-elena',
  otherUsername: 'elena',
  isVerified: true,
};

const groupDisplay: ConversationDisplay = {
  title: 'Frontend Core Team',
  avatar: null,
  isGroup: true,
  otherUserId: null,
  otherUsername: null,
  isVerified: false,
};

function ChatThreadHeaderStoryWrapper({
  isGroup = false,
  isTyping = false,
}: {
  isGroup?: boolean;
  isTyping?: boolean;
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <div className="w-[600px] max-w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
      <ChatThreadHeader
        display={isGroup ? groupDisplay : directDisplay}
        otherUserId={isGroup ? null : 'u-elena'}
        isOtherTyping={isTyping}
        isDetailsOpen={isDetailsOpen}
        onToggleDetails={() => setIsDetailsOpen((prev) => !prev)}
        isGroup={isGroup}
        memberAvatars={[
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        ]}
        memberCount={8}
      />
    </div>
  );
}

const meta: Meta<typeof ChatThreadHeader> = {
  title: 'Features/Chat/ChatThreadHeader',
  component: ChatThreadHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ChatThreadHeader>;

export const DirectChat: Story = {
  render: () => <ChatThreadHeaderStoryWrapper isGroup={false} />,
};

export const DirectChatTyping: Story = {
  render: () => <ChatThreadHeaderStoryWrapper isGroup={false} isTyping={true} />,
};

export const GroupChat: Story = {
  render: () => <ChatThreadHeaderStoryWrapper isGroup={true} />,
};
