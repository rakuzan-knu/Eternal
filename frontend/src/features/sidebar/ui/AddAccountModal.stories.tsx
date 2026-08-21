import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { AddAccountModal } from './AddAccountModal';

function AddAccountModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Add Account
      </button>

      {isOpen && (
        <AddAccountModal onClose={() => setIsOpen(false)} onBack={() => setIsOpen(false)} />
      )}
    </div>
  );
}

const meta: Meta<typeof AddAccountModal> = {
  title: 'Features/Sidebar/AddAccountModal',
  component: AddAccountModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AddAccountModal>;

export const Default: Story = {
  render: () => <AddAccountModalStoryWrapper />,
};
