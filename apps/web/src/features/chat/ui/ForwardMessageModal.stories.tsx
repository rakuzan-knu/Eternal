import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ForwardMessageModal from './ForwardMessageModal';

function ForwardMessageModalStoryWrapper({ messageCount = 1 }: { messageCount?: number }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Forward Message ({messageCount})
      </button>

      {isOpen && (
        <ForwardMessageModal
          messageCount={messageCount}
          onClose={() => setIsOpen(false)}
          onForward={(convIds, hideAuthor) => {
            console.log('Forward to convIds:', convIds, 'hideAuthor:', hideAuthor);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof ForwardMessageModal> = {
  title: 'Features/Chat/ForwardMessageModal',
  component: ForwardMessageModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ForwardMessageModal>;

export const SingleMessage: Story = {
  render: () => <ForwardMessageModalStoryWrapper messageCount={1} />,
};

export const MultipleMessages: Story = {
  render: () => <ForwardMessageModalStoryWrapper messageCount={4} />,
};
