import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ManageAccountsModal } from './ManageAccountsModal';

function ManageAccountsModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Manage Accounts
      </button>

      {isOpen && (
        <ManageAccountsModal
          onClose={() => setIsOpen(false)}
          onAddAccount={() => console.log('Add account')}
          onSwitchAccount={(id) => console.log('Switch account:', id)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof ManageAccountsModal> = {
  title: 'Features/Sidebar/ManageAccountsModal',
  component: ManageAccountsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ManageAccountsModal>;

export const Default: Story = {
  render: () => <ManageAccountsModalStoryWrapper />,
};
