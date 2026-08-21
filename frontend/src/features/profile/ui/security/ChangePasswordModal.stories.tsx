import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ChangePasswordModal from './ChangePasswordModal';

function ChangePasswordModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Change Password
      </button>

      {isOpen && <ChangePasswordModal onClose={() => setIsOpen(false)} />}
    </div>
  );
}

const meta: Meta<typeof ChangePasswordModal> = {
  title: 'Features/Profile/Security/ChangePasswordModal',
  component: ChangePasswordModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ChangePasswordModal>;

export const Default: Story = {
  render: () => <ChangePasswordModalStoryWrapper />,
};
