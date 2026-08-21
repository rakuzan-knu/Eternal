import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SkeletonPostCard, SkeletonFeed } from './SkeletonPostCard';

const meta: Meta<typeof SkeletonPostCard> = {
  title: 'Entities/Post/SkeletonPostCard',
  component: SkeletonPostCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    withMedia: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SkeletonPostCard>;

export const TextPostSkeleton: Story = {
  args: {
    withMedia: false,
  },
};

export const MediaPostSkeleton: Story = {
  args: {
    withMedia: true,
  },
};

export const FullFeedSkeleton: Story = {
  render: () => <SkeletonFeed count={3} />,
};
