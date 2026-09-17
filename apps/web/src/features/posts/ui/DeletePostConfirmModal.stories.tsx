import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import DeletePostConfirmModal from './DeletePostConfirmModal';

function DeletePostConfirmModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"
      >
        Delete Post
      </button>

      <DeletePostConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          console.log('Post deleted confirmed');
          setIsOpen(false);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof DeletePostConfirmModal> = {
  title: 'Features/Posts/DeletePostConfirmModal',
  component: DeletePostConfirmModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DeletePostConfirmModal>;

export const Default: Story = {
  render: () => <DeletePostConfirmModalStoryWrapper />,
};
