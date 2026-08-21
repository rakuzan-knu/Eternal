import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import BadgeModal, { Badge } from './BadgeModal';
import { Code, Sparkles, Shield, Heart, Star } from 'lucide-react';

const sampleBadges: Badge[] = [
  {
    id: 'DEVELOPER',
    name: 'Developer',
    description: 'Core system architect and engineer',
    icon: <Code size={18} />,
  },
  {
    id: 'PREMIUM',
    name: 'Premium Level 4',
    description: 'Subscriber for over 1 year',
    icon: <Sparkles size={18} />,
  },
  {
    id: 'MODERATOR',
    name: 'Moderator',
    description: 'Community moderator and guardian',
    icon: <Shield size={18} />,
  },
  {
    id: 'EARLY_SUPPORTER',
    name: 'Early Supporter',
    description: 'Joined during early alpha launch',
    icon: <Heart size={18} />,
  },
  {
    id: 'BETA_TESTER',
    name: 'Beta Tester',
    description: 'Tested experimental features',
    icon: <Star size={18} />,
  },
];

function BadgeModalWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium"
      >
        View Badges
      </button>
      <BadgeModal isOpen={isOpen} onClose={() => setIsOpen(false)} badges={sampleBadges} />
    </div>
  );
}

const meta: Meta<typeof BadgeModal> = {
  title: 'Features/Profile/BadgeModal',
  component: BadgeModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof BadgeModal>;

export const Default: Story = {
  render: () => <BadgeModalWrapper />,
};
