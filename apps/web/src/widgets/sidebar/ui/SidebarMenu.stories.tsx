import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ProfileMenu } from './SidebarMenu';

const meta: Meta<typeof ProfileMenu> = {
  title: 'Features/Sidebar/SidebarMenu',
  component: ProfileMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[260px] p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileMenu>;

export const ExpandedSidebar: Story = {
  args: {
    isSidebarExpanded: true,
  },
};

export const CollapsedSidebar: Story = {
  args: {
    isSidebarExpanded: false,
  },
};
