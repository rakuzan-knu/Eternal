import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ChatPollCard from './ChatPollCard';
import { ChatPollData } from '../lib/chatPoll';

const sampleChatPoll: ChatPollData = {
  type: 'POLL',
  question: 'Where should we hold the next engineering offsite?',
  options: [
    { id: 'opt-1', text: 'Kyoto, Japan', votes: 12 },
    { id: 'opt-2', text: 'Reykjavik, Iceland', votes: 8 },
    { id: 'opt-3', text: 'Zurich, Switzerland', votes: 15 },
  ],
};

const meta: Meta<typeof ChatPollCard> = {
  title: 'Features/Chat/ChatPollCard',
  component: ChatPollCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatPollCard>;

export const Unvoted: Story = {
  args: {
    messageId: 'msg-poll-1',
    poll: sampleChatPoll,
    isOwnMessage: false,
  },
};
