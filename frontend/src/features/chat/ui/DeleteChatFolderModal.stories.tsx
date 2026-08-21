import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import DeleteChatFolderModal from './DeleteChatFolderModal';

function DeleteChatFolderModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"
      >
        Open Delete Folder Modal
      </button>

      {isOpen && (
        <DeleteChatFolderModal
          folderName="Work Projects"
          onClose={() => setIsOpen(false)}
          onConfirm={() => {
            console.log('Delete folder confirmed');
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof DeleteChatFolderModal> = {
  title: 'Features/Chat/DeleteChatFolderModal',
  component: DeleteChatFolderModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DeleteChatFolderModal>;

export const Default: Story = {
  render: () => <DeleteChatFolderModalStoryWrapper />,
};
