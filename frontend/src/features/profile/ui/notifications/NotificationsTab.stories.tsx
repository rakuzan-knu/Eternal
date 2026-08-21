import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import NotificationsTab from './NotificationsTab';

const meta: Meta<typeof NotificationsTab> = {
  title: 'Features/Profile/Notifications/NotificationsTab',
  component: NotificationsTab,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] max-w-full p-6 bg-neutral-900 border border-neutral-800 rounded-3xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NotificationsTab>;

export const Default: Story = {};
