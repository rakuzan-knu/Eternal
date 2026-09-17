import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { PremiumBadgeModal } from './PremiumBadgeModal';

function PremiumBadgeModalStoryWrapper({
  subscriptionMonths = 6,
}: {
  subscriptionMonths?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-semibold rounded-xl text-sm"
      >
        View Premium Badges
      </button>

      <PremiumBadgeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        subscriptionMonths={subscriptionMonths}
      />
    </div>
  );
}

const meta: Meta<typeof PremiumBadgeModal> = {
  title: 'Features/Profile/PremiumBadgeModal',
  component: PremiumBadgeModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PremiumBadgeModal>;

export const ActiveSubscriber: Story = {
  render: () => <PremiumBadgeModalStoryWrapper subscriptionMonths={12} />,
};

export const NonSubscriber: Story = {
  render: () => <PremiumBadgeModalStoryWrapper subscriptionMonths={0} />,
};
