import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MenuItem } from './MenuItem';
import { Settings, Bell, LogOut } from 'lucide-react';

const meta: Meta<typeof MenuItem> = {
  title: 'Features/Sidebar/MenuItem',
  component: MenuItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: { control: 'text' },
    badge: { control: 'text' },
    hasChevron: { control: 'boolean' },
    danger: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
  decorators: [
    (Story) => (
      <div className="w-[280px] p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MenuItem>;

export const Standard: Story = {
  args: {
    icon: Settings,
    label: 'Settings',
    hasChevron: true,
  },
};

export const WithBadge: Story = {
  args: {
    icon: Bell,
    label: 'Notifications',
    badge: 'NEW',
    hasChevron: true,
  },
};

export const DangerItem: Story = {
  args: {
    icon: LogOut,
    label: 'Log out',
    danger: true,
  },
};
