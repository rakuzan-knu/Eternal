import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import EmptyState from './EmptyState';
import { MessageSquare, Users, Bell } from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
  title: 'Shared/UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const NoMessages: Story = {
  args: {
    icon: <MessageSquare className="w-8 h-8 text-white" />,
    title: 'No Messages Yet',
    subtitle: 'Start a conversation by selecting a user from the search.',
  },
};

export const NoFollowers: Story = {
  args: {
    icon: <Users className="w-8 h-8 text-white" />,
    title: 'No Followers',
    subtitle: 'Follow accounts to see updates in your personalized feed.',
  },
};

export const NoNotifications: Story = {
  args: {
    icon: <Bell className="w-8 h-8 text-white" />,
    title: 'All Caught Up',
    subtitle: 'You have no unread notifications at this time.',
  },
};
