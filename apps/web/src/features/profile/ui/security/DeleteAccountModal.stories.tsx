import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import DeleteAccountModal from './DeleteAccountModal';

function DeleteAccountModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"
      >
        Delete Account
      </button>

      {isOpen && <DeleteAccountModal onClose={() => setIsOpen(false)} />}
    </div>
  );
}

const meta: Meta<typeof DeleteAccountModal> = {
  title: 'Features/Profile/Security/DeleteAccountModal',
  component: DeleteAccountModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DeleteAccountModal>;

export const Default: Story = {
  render: () => <DeleteAccountModalStoryWrapper />,
};
