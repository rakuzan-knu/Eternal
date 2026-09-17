import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { HoverFlyout } from './HoverFlyout';
import { Settings } from 'lucide-react';

const meta: Meta<typeof HoverFlyout> = {
  title: 'Features/Sidebar/HoverFlyout',
  component: HoverFlyout,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="p-20 relative flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HoverFlyout>;

export const Default: Story = {
  args: {
    trigger: ({ toggle }) => (
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-medium"
      >
        <Settings size={18} />
        <span>Hover for options</span>
      </button>
    ),
    children: (
      <div className="flex flex-col gap-2 p-1">
        <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Quick Actions
        </div>
        <button className="text-left px-3 py-1.5 rounded-lg hover:bg-white/10 text-sm text-white transition">
          Option A
        </button>
        <button className="text-left px-3 py-1.5 rounded-lg hover:bg-white/10 text-sm text-white transition">
          Option B
        </button>
      </div>
    ),
  },
};
