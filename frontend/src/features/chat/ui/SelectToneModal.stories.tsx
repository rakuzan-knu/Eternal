import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import SelectToneModal from './SelectToneModal';

function SelectToneModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Tone Selector
      </button>

      {isOpen && <SelectToneModal conversationId="conv-1" onClose={() => setIsOpen(false)} />}
    </div>
  );
}

const meta: Meta<typeof SelectToneModal> = {
  title: 'Features/Chat/SelectToneModal',
  component: SelectToneModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SelectToneModal>;

export const Default: Story = {
  render: () => <SelectToneModalStoryWrapper />,
};
