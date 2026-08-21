import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import AddMembersModal from './AddMembersModal';

function AddMembersModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Add Members
      </button>

      {isOpen && (
        <AddMembersModal
          conversationId="conv-1"
          existingMemberIds={['user-1']}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof AddMembersModal> = {
  title: 'Features/Chat/AddMembersModal',
  component: AddMembersModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AddMembersModal>;

export const Default: Story = {
  render: () => <AddMembersModalStoryWrapper />,
};
