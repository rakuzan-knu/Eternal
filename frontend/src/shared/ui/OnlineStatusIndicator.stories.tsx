import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import Avatar from './Avatar';

const meta: Meta<typeof OnlineStatusIndicator> = {
  title: 'Shared/UI/OnlineStatusIndicator',
  component: OnlineStatusIndicator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    userId: { control: 'text' },
    variant: { control: 'select', options: ['dot', 'text'] },
    size: { control: 'select', options: ['sm', 'md'] },
    showOfflineDot: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof OnlineStatusIndicator>;

export const DotOnAvatar: Story = {
  render: () => (
    <div className="relative w-12 h-12">
      <Avatar name="Alex Smith" size="md" />
      <OnlineStatusIndicator userId="user-1" variant="dot" size="sm" />
    </div>
  ),
};

export const TextVariant: Story = {
  args: {
    userId: 'user-2',
    variant: 'text',
  },
};

export const OfflineDot: Story = {
  render: () => (
    <div className="relative w-12 h-12">
      <Avatar name="Offline User" size="md" />
      <OnlineStatusIndicator userId="offline-user" variant="dot" showOfflineDot={true} />
    </div>
  ),
};
