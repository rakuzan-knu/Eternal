import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { SaveToCollectionPopover } from './SaveToCollectionPopover';

function SaveToCollectionPopoverStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-20 relative h-[360px] flex items-center justify-center">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Save to Collection
      </button>

      <SaveToCollectionPopover
        postId="post-1"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onPostSaved={() => console.log('Saved!')}
      />
    </div>
  );
}

const meta: Meta<typeof SaveToCollectionPopover> = {
  title: 'Features/Posts/SaveToCollectionPopover',
  component: SaveToCollectionPopover,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SaveToCollectionPopover>;

export const Default: Story = {
  render: () => <SaveToCollectionPopoverStoryWrapper />,
};
