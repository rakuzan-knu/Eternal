import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import DeleteChatHistoryModal from './DeleteChatHistoryModal';

function DeleteChatHistoryModalStoryWrapper({ isGroup = false }: { isGroup?: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"
      >
        Clear Chat History
      </button>

      {isOpen && (
        <DeleteChatHistoryModal
          conversationName={isGroup ? 'Developers Hangout' : 'Elena Rostova'}
          isGroup={isGroup}
          onClose={() => setIsOpen(false)}
          onConfirm={() => {
            console.log('Chat history cleared');
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof DeleteChatHistoryModal> = {
  title: 'Features/Chat/DeleteChatHistoryModal',
  component: DeleteChatHistoryModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DeleteChatHistoryModal>;

export const DirectChat: Story = {
  render: () => <DeleteChatHistoryModalStoryWrapper isGroup={false} />,
};

export const GroupChat: Story = {
  render: () => <DeleteChatHistoryModalStoryWrapper isGroup={true} />,
};
