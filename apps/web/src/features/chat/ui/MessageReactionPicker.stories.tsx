import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import MessageReactionPicker from './MessageReactionPicker';

function ReactionPickerWrapper() {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="p-32 flex flex-col items-center gap-4">
      <div className="text-sm text-neutral-400">
        Last picked reaction: <span className="text-2xl">{picked || 'None'}</span>
      </div>
      <div className="relative">
        <MessageReactionPicker
          onPick={(emoji) => setPicked(emoji)}
          onClose={() => console.log('Close picker')}
        />
      </div>
    </div>
  );
}

const meta: Meta<typeof MessageReactionPicker> = {
  title: 'Features/Chat/MessageReactionPicker',
  component: MessageReactionPicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MessageReactionPicker>;

export const Default: Story = {
  render: () => <ReactionPickerWrapper />,
};
