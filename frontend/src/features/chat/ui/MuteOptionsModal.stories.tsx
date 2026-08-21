import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import MuteOptionsModal from './MuteOptionsModal';

function MuteOptionsModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Mute Chat
      </button>

      {isOpen && (
        <MuteOptionsModal
          onClose={() => setIsOpen(false)}
          onConfirm={(level, until) => {
            console.log('Muted level:', level, 'until:', until);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof MuteOptionsModal> = {
  title: 'Features/Chat/MuteOptionsModal',
  component: MuteOptionsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MuteOptionsModal>;

export const Default: Story = {
  render: () => <MuteOptionsModalStoryWrapper />,
};
