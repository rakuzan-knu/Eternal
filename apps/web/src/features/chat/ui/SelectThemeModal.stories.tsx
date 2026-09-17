import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import SelectThemeModal from './SelectThemeModal';

function SelectThemeModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Choose Chat Theme
      </button>

      {isOpen && (
        <SelectThemeModal
          conversationId="conv-1"
          currentTheme="midnight-purple"
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof SelectThemeModal> = {
  title: 'Features/Chat/SelectThemeModal',
  component: SelectThemeModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SelectThemeModal>;

export const Default: Story = {
  render: () => <SelectThemeModalStoryWrapper />,
};
