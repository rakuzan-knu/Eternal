import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ChatListSkeleton, ChatListMoreSkeleton } from './ChatListSkeletons';

const meta: Meta<typeof ChatListSkeleton> = {
  title: 'Features/Chat/ChatListSkeletons',
  component: ChatListSkeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[340px] max-w-full p-2 bg-[#121216] rounded-2xl border border-white/10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatListSkeleton>;

export const InitialListLoading: Story = {
  render: () => <ChatListSkeleton />,
};

export const LoadMoreSkeletons: Story = {
  render: () => <ChatListMoreSkeleton />,
};
