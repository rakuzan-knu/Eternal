import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ChatFolderRail from './ChatFolderRail';
import { ChatFolder } from '../model/useChatFoldersStore';
import { ConversationView } from '../../../entities/chat/model/types';

const sampleFolders: ChatFolder[] = [
  {
    id: 'all',
    name: 'All Chats',
    icon: 'messages',
    emoji: null,
    color: '#8b5cf6',
    isSystem: true,
    includeIds: [],
    excludeIds: [],
  },
  {
    id: 'unread',
    name: 'Unread',
    icon: 'mail',
    emoji: null,
    color: '#3b82f6',
    isSystem: true,
    includeIds: [],
    excludeIds: [],
  },
  {
    id: 'work',
    name: 'Work',
    icon: 'briefcase',
    emoji: null,
    color: '#10b981',
    isSystem: false,
    includeIds: ['conv-1'],
    excludeIds: [],
  },
  {
    id: 'design',
    name: 'Design Team',
    icon: 'palette',
    emoji: null,
    color: '#f59e0b',
    isSystem: false,
    includeIds: ['conv-2'],
    excludeIds: [],
  },
];

const sampleConversations: ConversationView[] = [
  {
    id: 'conv-1',
    isGroup: false,
    title: 'Elena Rostova',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    unreadCount: 3,
    lastMessage: {
      id: 'm1',
      body: 'Can we review the PR?',
      createdAt: '2026-08-21T11:00:00Z',
      sender: { id: 'u1', username: 'elena', displayName: 'Elena Rostova', avatar: null },
    },
    updatedAt: '2026-08-21T11:00:00Z',
  } as unknown as ConversationView,
];

function ChatFolderRailStoryWrapper() {
  const [activeFolderId, setActiveFolderId] = useState('all');
  const [folders, setFolders] = useState(sampleFolders);

  return (
    <div className="w-[450px] max-w-full p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
      <ChatFolderRail
        folders={folders}
        conversations={sampleConversations}
        forcedUnreadIds={new Set()}
        activeFolderId={activeFolderId}
        onSelect={setActiveFolderId}
        onCreate={() => console.log('Create folder')}
        onContextMenu={(folder, x, y) => console.log('Context menu:', folder.name, x, y)}
        onReorder={(ids) => {
          const reordered = ids.map((id) => folders.find((f) => f.id === id)!).filter(Boolean);
          setFolders(reordered);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof ChatFolderRail> = {
  title: 'Features/Chat/ChatFolderRail',
  component: ChatFolderRail,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ChatFolderRail>;

export const Default: Story = {
  render: () => <ChatFolderRailStoryWrapper />,
};
