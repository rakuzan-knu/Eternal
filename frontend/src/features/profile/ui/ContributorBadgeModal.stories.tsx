import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ContributorBadgeModal } from './ContributorBadgeModal';

function ContributorBadgeModalStoryWrapper({
  prCount = 3,
  reportCount = 2,
}: {
  prCount?: number;
  reportCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        View Contributor Badges
      </button>

      <ContributorBadgeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        prCount={prCount}
        reportCount={reportCount}
      />
    </div>
  );
}

const meta: Meta<typeof ContributorBadgeModal> = {
  title: 'Features/Profile/ContributorBadgeModal',
  component: ContributorBadgeModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ContributorBadgeModal>;

export const WithContributions: Story = {
  render: () => <ContributorBadgeModalStoryWrapper prCount={5} reportCount={3} />,
};

export const Starter: Story = {
  render: () => <ContributorBadgeModalStoryWrapper prCount={0} reportCount={0} />,
};
