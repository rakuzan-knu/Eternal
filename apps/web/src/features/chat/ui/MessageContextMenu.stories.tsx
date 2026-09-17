import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import MessageContextMenu from './MessageContextMenu';
import { MessageView } from '../../../entities/chat/model/types';

const sampleMessage: MessageView = {
  id: 'msg-1',
  body: 'Hello everyone! Please check out the new design.',
  senderId: 'user-1',
  isPinned: false,
} as unknown as MessageView;

function MessageContextMenuStoryWrapper({ isOwn = true }: { isOwn?: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-20 relative h-[320px] flex items-center justify-center">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Message Menu
      </button>

      {isOpen && (
        <MessageContextMenu
          message={sampleMessage}
          isOwnMessage={isOwn}
          onClose={() => setIsOpen(false)}
          onEdit={() => console.log('Edit')}
          onDelete={() => console.log('Delete')}
          onForward={() => console.log('Forward')}
          onTogglePin={() => console.log('Pin')}
          onReport={() => console.log('Report')}
          onSelectMessage={() => console.log('Select')}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof MessageContextMenu> = {
  title: 'Features/Chat/MessageContextMenu',
  component: MessageContextMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MessageContextMenu>;

export const OwnMessage: Story = {
  render: () => <MessageContextMenuStoryWrapper isOwn={true} />,
};

export const OtherUserMessage: Story = {
  render: () => <MessageContextMenuStoryWrapper isOwn={false} />,
};
