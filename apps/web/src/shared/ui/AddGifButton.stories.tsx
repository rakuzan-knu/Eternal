import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { AddGifButton } from './AddGifButton';

function AddGifWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);

  return (
    <div className="p-20 flex flex-col items-center gap-4">
      {selectedGif && (
        <div className="w-48 h-32 rounded-xl overflow-hidden border border-white/10">
          <img src={selectedGif} alt="Selected GIF" className="w-full h-full object-cover" />
        </div>
      )}
      <AddGifButton
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        onGifSelect={(gif) => {
          setSelectedGif(gif);
          setIsOpen(false);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof AddGifButton> = {
  title: 'Shared/UI/AddGifButton',
  component: AddGifButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AddGifButton>;

export const Default: Story = {
  render: () => <AddGifWrapper />,
};
