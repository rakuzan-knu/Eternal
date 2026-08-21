import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MessageThreadSkeleton, SkeletonMessage } from './MessageListSkeletons';

const meta: Meta<typeof MessageThreadSkeleton> = {
  title: 'Features/Chat/MessageListSkeletons',
  component: MessageThreadSkeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[450px] max-w-full p-4 bg-[#121216] rounded-3xl border border-white/10 shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageThreadSkeleton>;

export const FullThreadLoading: Story = {
  render: () => <MessageThreadSkeleton />,
};

export const SingleMessageOther: Story = {
  render: () => <SkeletonMessage own={false} withMedia={false} />,
};

export const SingleMessageOwnWithMedia: Story = {
  render: () => <SkeletonMessage own={true} withMedia={true} />,
};
