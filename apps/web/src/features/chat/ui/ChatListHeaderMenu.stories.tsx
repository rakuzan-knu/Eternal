import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ChatListHeaderMenu from './ChatListHeaderMenu';

function ChatListHeaderMenuStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-20 relative h-[360px] flex items-center justify-center">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Chat Header Menu
      </button>

      {isOpen && (
        <ChatListHeaderMenu
          archivedCount={5}
          onClose={() => setIsOpen(false)}
          onOpen={(section) => {
            console.log('Opened section:', section);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof ChatListHeaderMenu> = {
  title: 'Features/Chat/ChatListHeaderMenu',
  component: ChatListHeaderMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ChatListHeaderMenu>;

export const Default: Story = {
  render: () => <ChatListHeaderMenuStoryWrapper />,
};
