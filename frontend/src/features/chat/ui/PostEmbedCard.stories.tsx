import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PostEmbedCard } from './PostEmbedCard';

const meta: Meta<typeof PostEmbedCard> = {
  title: 'Features/Chat/PostEmbedCard',
  component: PostEmbedCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    postId: { control: 'text' },
    isOwnMessage: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="w-[380px] max-w-full p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PostEmbedCard>;

export const Default: Story = {
  args: {
    postId: 'post-100',
    isOwnMessage: false,
  },
};

export const OwnMessage: Story = {
  args: {
    postId: 'post-100',
    isOwnMessage: true,
  },
};
