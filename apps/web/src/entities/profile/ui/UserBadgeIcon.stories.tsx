import type { Meta, StoryObj } from '@storybook/react';
import UserBadgeIcon from './UserBadgeIcon';

const meta: Meta<typeof UserBadgeIcon> = {
  title: 'Entities/Profile/UserBadgeIcon',
  component: UserBadgeIcon,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    badgeId: {
      control: 'select',
      options: [
        'VERIFIED',
        'PREMIUM',
        'CONTRIBUTOR',
        'DEVELOPER',
        'MODERATOR',
        'EARLY_SUPPORTER',
        'BETA_TESTER',
        'PARTNER',
      ],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    showTooltip: { control: 'boolean' },
    subscriptionMonths: { control: 'number' },
    prCount: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof UserBadgeIcon>;

export const Verified: Story = {
  args: {
    badgeId: 'VERIFIED',
    size: 'md',
  },
};

export const PremiumBronze: Story = {
  args: {
    badgeId: 'PREMIUM',
    subscriptionMonths: 1,
    size: 'lg',
  },
};

export const PremiumDiamond: Story = {
  args: {
    badgeId: 'PREMIUM',
    subscriptionMonths: 24,
    size: 'lg',
  },
};

export const PremiumOpal: Story = {
  args: {
    badgeId: 'PREMIUM',
    subscriptionMonths: 72,
    size: 'lg',
  },
};

export const ContributorTier: Story = {
  args: {
    badgeId: 'CONTRIBUTOR',
    prCount: 15,
    size: 'lg',
  },
};

export const Developer: Story = {
  args: {
    badgeId: 'DEVELOPER',
    size: 'md',
  },
};

export const Moderator: Story = {
  args: {
    badgeId: 'MODERATOR',
    size: 'md',
  },
};
