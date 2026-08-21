import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import NewGroupModal from './NewGroupModal';

function NewGroupModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Create New Group
      </button>

      {isOpen && (
        <NewGroupModal
          onClose={() => setIsOpen(false)}
          onCreated={(convId) => {
            console.log('Group created with id:', convId);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof NewGroupModal> = {
  title: 'Features/Chat/NewGroupModal',
  component: NewGroupModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof NewGroupModal>;

export const Default: Story = {
  render: () => <NewGroupModalStoryWrapper />,
};
