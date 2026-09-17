import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import BlockUserModal from './BlockUserModal';

function BlockUserModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"
      >
        Block User
      </button>

      {isOpen && <BlockUserModal onClose={() => setIsOpen(false)} />}
    </div>
  );
}

const meta: Meta<typeof BlockUserModal> = {
  title: 'Features/Chat/BlockUserModal',
  component: BlockUserModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof BlockUserModal>;

export const Default: Story = {
  render: () => <BlockUserModalStoryWrapper />,
};
