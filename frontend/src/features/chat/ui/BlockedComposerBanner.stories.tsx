import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import BlockedComposerBanner from './BlockedComposerBanner';

const meta: Meta<typeof BlockedComposerBanner> = {
  title: 'Features/Chat/BlockedComposerBanner',
  component: BlockedComposerBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] max-w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BlockedComposerBanner>;

export const BlockedByMe: Story = {
  args: {
    otherUserId: 'user-2',
    blockedByMe: true,
    blockingMe: false,
  },
};

export const BlockingMe: Story = {
  args: {
    otherUserId: 'user-3',
    blockedByMe: false,
    blockingMe: true,
  },
};
