import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { AddEmojiButton } from './AddEmojiButton';

function AddEmojiWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('');

  return (
    <div className="p-20 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-400">Selected:</span>
        <span className="text-2xl">{selectedEmoji || 'None'}</span>
      </div>
      <AddEmojiButton
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        onEmojiSelect={(emoji) => {
          setSelectedEmoji(emoji);
          setIsOpen(false);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof AddEmojiButton> = {
  title: 'Shared/UI/AddEmojiButton',
  component: AddEmojiButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AddEmojiButton>;

export const Default: Story = {
  render: () => <AddEmojiWrapper />,
};
