import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import UserNameWithBadges from './UserNameWithBadges';

const meta: Meta<typeof UserNameWithBadges> = {
  title: 'Entities/Profile/UserNameWithBadges',
  component: UserNameWithBadges,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    username: { control: 'text' },
    displayName: { control: 'text' },
    isVerified: { control: 'boolean' },
    primaryBadge: {
      control: 'select',
      options: [null, 'VERIFIED', 'PREMIUM', 'CONTRIBUTOR', 'DEVELOPER', 'EARLY_SUPPORTER'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  decorators: [
    (Story) => (
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center min-w-[280px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UserNameWithBadges>;

export const VerifiedUser: Story = {
  args: {
    displayName: 'Pavel Durov',
    username: 'durov',
    isVerified: true,
    size: 'md',
  },
};

export const PremiumDeveloper: Story = {
  args: {
    displayName: 'Elena Rostova',
    username: 'elena_dev',
    isVerified: true,
    primaryBadge: 'DEVELOPER',
    size: 'lg',
  },
};

export const EarlySupporterSmall: Story = {
  args: {
    displayName: 'Alex Carter',
    username: 'alex',
    primaryBadge: 'EARLY_SUPPORTER',
    size: 'sm',
  },
};
