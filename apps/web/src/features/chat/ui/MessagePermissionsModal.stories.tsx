import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import MessagePermissionsModal from './MessagePermissionsModal';

function MessagePermissionsModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Message Permissions
      </button>

      {isOpen && <MessagePermissionsModal onClose={() => setIsOpen(false)} />}
    </div>
  );
}

const meta: Meta<typeof MessagePermissionsModal> = {
  title: 'Features/Chat/MessagePermissionsModal',
  component: MessagePermissionsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MessagePermissionsModal>;

export const Default: Story = {
  render: () => <MessagePermissionsModalStoryWrapper />,
};
