import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ChatFolderContextMenu from './ChatFolderContextMenu';
import { ChatFolder } from '../model/useChatFoldersStore';

const sampleFolder: ChatFolder = {
  id: 'folder-1',
  name: 'Work Projects',
  icon: 'briefcase',
  emoji: null,
  color: '#3b82f6',
  isSystem: false,
  includeIds: [],
  excludeIds: [],
};

const sampleSystemFolder: ChatFolder = {
  id: 'all',
  name: 'All Chats',
  icon: 'messages',
  emoji: null,
  color: '#8b5cf6',
  isSystem: true,
  includeIds: [],
  excludeIds: [],
};

function ChatFolderContextMenuStoryWrapper({ folder }: { folder: ChatFolder }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-20 relative h-[300px] flex items-center justify-center">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium"
      >
        Right-click or click to open menu
      </button>

      {isOpen && (
        <ChatFolderContextMenu
          folder={folder}
          x={120}
          y={80}
          onClose={() => setIsOpen(false)}
          onEdit={() => console.log('Edit folder')}
          onMarkRead={() => console.log('Mark read')}
          onDelete={() => console.log('Delete folder')}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof ChatFolderContextMenu> = {
  title: 'Features/Chat/ChatFolderContextMenu',
  component: ChatFolderContextMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ChatFolderContextMenu>;

export const CustomFolder: Story = {
  render: () => <ChatFolderContextMenuStoryWrapper folder={sampleFolder} />,
};

export const SystemFolder: Story = {
  render: () => <ChatFolderContextMenuStoryWrapper folder={sampleSystemFolder} />,
};
