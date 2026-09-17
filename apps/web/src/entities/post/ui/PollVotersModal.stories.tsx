import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { PollVotersModal } from './PollVotersModal';

const sampleOptions = [
  { id: 'opt-1', text: 'React 19 & Vite' },
  { id: 'opt-2', text: 'Next.js App Router' },
  { id: 'opt-3', text: 'SvelteKit' },
];

function PollVotersWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium"
      >
        Open Poll Voters
      </button>

      {isOpen && (
        <PollVotersModal
          postId="post-100"
          options={sampleOptions}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof PollVotersModal> = {
  title: 'Entities/Post/PollVotersModal',
  component: PollVotersModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PollVotersModal>;

export const Default: Story = {
  render: () => <PollVotersWrapper />,
};
