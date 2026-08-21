import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import BadgeList from './BadgeList';
import { Badge } from './BadgeModal';
import { Shield, Sparkles, Code, Heart, Star } from 'lucide-react';

const mockBadges: Badge[] = [
  {
    id: 'DEVELOPER',
    name: 'Developer',
    description: 'Core system contributor',
    icon: <Code size={18} />,
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    description: 'Active subscriber',
    icon: <Sparkles size={18} />,
  },
  {
    id: 'MODERATOR',
    name: 'Moderator',
    description: 'Community moderator',
    icon: <Shield size={18} />,
  },
  {
    id: 'EARLY_SUPPORTER',
    name: 'Early Supporter',
    description: 'Joined during alpha stage',
    icon: <Heart size={18} />,
  },
  {
    id: 'BETA_TESTER',
    name: 'Beta Tester',
    description: 'Feature validation pioneer',
    icon: <Star size={18} />,
  },
  {
    id: 'CONTRIBUTOR',
    name: 'Contributor',
    description: 'Open source code contributor',
    icon: <Code size={18} />,
  },
];

const meta: Meta<typeof BadgeList> = {
  title: 'Features/Profile/BadgeList',
  component: BadgeList,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BadgeList>;

export const FewBadges: Story = {
  args: {
    badges: mockBadges.slice(0, 3),
  },
};

export const ManyBadgesWithMore: Story = {
  args: {
    badges: mockBadges,
  },
};
