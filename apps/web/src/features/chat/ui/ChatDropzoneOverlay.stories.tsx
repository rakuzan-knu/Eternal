import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ChatDropzoneOverlay from './ChatDropzoneOverlay';

const meta: Meta<typeof ChatDropzoneOverlay> = {
  title: 'Features/Chat/ChatDropzoneOverlay',
  component: ChatDropzoneOverlay,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="relative w-[500px] h-[350px] bg-neutral-950 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between overflow-hidden">
        <div className="text-sm text-neutral-400">Chat messages area...</div>
        <div className="h-12 bg-neutral-900 rounded-xl flex items-center px-4 text-neutral-500 text-xs">
          Message input placeholder...
        </div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatDropzoneOverlay>;

export const Active: Story = {
  args: {
    isDragging: true,
  },
};
