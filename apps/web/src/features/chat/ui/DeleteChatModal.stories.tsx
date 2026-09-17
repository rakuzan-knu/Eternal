import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import DeleteChatModal from './DeleteChatModal';

function DeleteChatModalStoryWrapper({ isGroup = false }: { isGroup?: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium"
      >
        Open Delete Modal
      </button>

      {isOpen && (
        <DeleteChatModal
          conversationName={isGroup ? 'Developers Hangout' : 'Elena Rostova'}
          avatarUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
          isGroup={isGroup}
          memberAvatars={
            isGroup
              ? [
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
                ]
              : []
          }
          onClose={() => setIsOpen(false)}
          onConfirm={(forAll) => {
            console.log('Delete chat confirmed. forAll:', forAll);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof DeleteChatModal> = {
  title: 'Features/Chat/DeleteChatModal',
  component: DeleteChatModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DeleteChatModal>;

export const DirectChat: Story = {
  render: () => <DeleteChatModalStoryWrapper isGroup={false} />,
};

export const GroupChat: Story = {
  render: () => <DeleteChatModalStoryWrapper isGroup={true} />,
};
