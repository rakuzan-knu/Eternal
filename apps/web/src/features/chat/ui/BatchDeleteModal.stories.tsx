import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import BatchDeleteModal from './BatchDeleteModal';

function BatchDeleteModalStoryWrapper({
  count = 5,
  canDeleteForAll = true,
}: {
  count?: number;
  canDeleteForAll?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"
      >
        Delete Selected Messages ({count})
      </button>

      {isOpen && (
        <BatchDeleteModal
          count={count}
          canDeleteForAll={canDeleteForAll}
          onClose={() => setIsOpen(false)}
          onConfirm={(forAll) => {
            console.log('Batch delete confirmed. forAll:', forAll);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof BatchDeleteModal> = {
  title: 'Features/Chat/BatchDeleteModal',
  component: BatchDeleteModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof BatchDeleteModal>;

export const MultipleMessages: Story = {
  render: () => <BatchDeleteModalStoryWrapper count={4} canDeleteForAll={true} />,
};

export const SingleMessage: Story = {
  render: () => <BatchDeleteModalStoryWrapper count={1} canDeleteForAll={false} />,
};
