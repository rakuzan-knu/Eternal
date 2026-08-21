import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import DeleteMessageModal from './DeleteMessageModal';

function DeleteMessageModalStoryWrapper({ isOwnMessage }: { isOwnMessage: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"
      >
        Open Delete Message Dialog
      </button>

      {isOpen && (
        <DeleteMessageModal
          isOwnMessage={isOwnMessage}
          onClose={() => setIsOpen(false)}
          onConfirm={(forAll) => {
            console.log('Message deleted, forAll:', forAll);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof DeleteMessageModal> = {
  title: 'Features/Chat/DeleteMessageModal',
  component: DeleteMessageModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DeleteMessageModal>;

export const OwnMessage: Story = {
  render: () => <DeleteMessageModalStoryWrapper isOwnMessage={true} />,
};

export const OtherUserMessage: Story = {
  render: () => <DeleteMessageModalStoryWrapper isOwnMessage={false} />,
};
