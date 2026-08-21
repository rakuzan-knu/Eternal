import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SavedPostsView } from './SavedPostsView';

const meta: Meta<typeof SavedPostsView> = {
  title: 'Features/Profile/Saved/SavedPostsView',
  component: SavedPostsView,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[600px] max-w-full p-4 bg-[#0b0b0c]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SavedPostsView>;

export const Default: Story = {
  args: {
    userId: 'user-1',
  },
};
