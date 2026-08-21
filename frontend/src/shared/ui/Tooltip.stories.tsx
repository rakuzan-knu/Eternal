import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import Tooltip from './Tooltip';
import { Info, HelpCircle, Heart, Share2 } from 'lucide-react';

const meta: Meta<typeof Tooltip> = {
  title: 'Shared/UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: { control: 'text' },
    position: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const TopPosition: Story = {
  args: {
    label: 'Verified creator status',
    position: 'top',
    children: (
      <button
        type="button"
        className="p-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl"
      >
        <Info size={20} />
      </button>
    ),
  },
};

export const RightPosition: Story = {
  args: {
    label: 'Like this post',
    position: 'right',
    children: (
      <button
        type="button"
        className="p-3 bg-neutral-800 hover:bg-neutral-700 text-red-400 rounded-xl"
      >
        <Heart size={20} />
      </button>
    ),
  },
};

export const BottomPosition: Story = {
  args: {
    label: 'Share with friends',
    position: 'bottom',
    children: (
      <button
        type="button"
        className="p-3 bg-neutral-800 hover:bg-neutral-700 text-blue-400 rounded-xl"
      >
        <Share2 size={20} />
      </button>
    ),
  },
};

export const LeftPosition: Story = {
  args: {
    label: 'Help & Documentation',
    position: 'left',
    children: (
      <button
        type="button"
        className="p-3 bg-neutral-800 hover:bg-neutral-700 text-purple-400 rounded-xl"
      >
        <HelpCircle size={20} />
      </button>
    ),
  },
};
