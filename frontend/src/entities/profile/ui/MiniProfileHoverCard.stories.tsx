import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MiniProfileHoverCard } from './MiniProfileHoverCard';

const meta: Meta<typeof MiniProfileHoverCard> = {
  title: 'Entities/Profile/MiniProfileHoverCard',
  component: MiniProfileHoverCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="p-20 flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MiniProfileHoverCard>;

export const Default: Story = {
  args: {
    username: 'elena',
    side: 'bottom',
    align: 'center',
    children: (
      <span className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline decoration-dotted">
        @elena
      </span>
    ),
  },
};

export const DeveloperProfile: Story = {
  args: {
    username: 'marcus',
    side: 'top',
    align: 'left',
    children: (
      <button className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium text-white transition">
        Hover to view @marcus
      </button>
    ),
  },
};
