import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { OnlineFriendsSidebar } from './OnlineFriendsSidebar';

const meta: Meta<typeof OnlineFriendsSidebar> = {
  title: 'Widgets/Sidebar/OnlineFriendsSidebar',
  component: OnlineFriendsSidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px] h-[600px] bg-[#0b0b0c] p-2 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OnlineFriendsSidebar>;

export const Default: Story = {};
