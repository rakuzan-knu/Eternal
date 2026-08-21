import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ArchivedChatsModal from './ArchivedChatsModal';

function ArchivedChatsModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Archived Chats
      </button>

      {isOpen && <ArchivedChatsModal onClose={() => setIsOpen(false)} />}
    </div>
  );
}

const meta: Meta<typeof ArchivedChatsModal> = {
  title: 'Features/Chat/ArchivedChatsModal',
  component: ArchivedChatsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ArchivedChatsModal>;

export const Default: Story = {
  render: () => <ArchivedChatsModalStoryWrapper />,
};
