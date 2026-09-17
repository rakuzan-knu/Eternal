import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { BadgeSettingsSection } from './BadgeSettingsSection';

const meta: Meta<typeof BadgeSettingsSection> = {
  title: 'Features/Profile/BadgeSettingsSection',
  component: BadgeSettingsSection,
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
type Story = StoryObj<typeof BadgeSettingsSection>;

export const Default: Story = {
  args: {
    avatarPreview:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    bannerPreview:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    bannerPos: 50,
  },
};
