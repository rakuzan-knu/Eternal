import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import RestrictUserModal from './RestrictUserModal';

function RestrictUserModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-amber-600 text-black rounded-xl text-sm font-medium"
      >
        Restrict User
      </button>

      {isOpen && <RestrictUserModal userId="user-target" onClose={() => setIsOpen(false)} />}
    </div>
  );
}

const meta: Meta<typeof RestrictUserModal> = {
  title: 'Features/Chat/RestrictUserModal',
  component: RestrictUserModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof RestrictUserModal>;

export const Default: Story = {
  render: () => <RestrictUserModalStoryWrapper />,
};
