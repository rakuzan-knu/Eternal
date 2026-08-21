import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import PollComposer from './PollComposer';

function PollComposerStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-20 relative h-[420px] flex items-end">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Poll Composer
      </button>

      {isOpen && (
        <PollComposer
          onClose={() => setIsOpen(false)}
          onCreatePoll={(question, options) => {
            console.log('Created poll:', question, options);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof PollComposer> = {
  title: 'Features/Chat/PollComposer',
  component: PollComposer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PollComposer>;

export const Default: Story = {
  render: () => <PollComposerStoryWrapper />,
};
