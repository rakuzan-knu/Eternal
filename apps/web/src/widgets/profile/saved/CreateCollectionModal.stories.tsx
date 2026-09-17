import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { CreateCollectionModal } from './CreateCollectionModal';
import { PostType } from '@/entities/post/model/types';

const sampleSavedPosts: PostType[] = [
  {
    id: 'p1',
    authorId: 'u1',
    author: 'Elena Rostova',
    handle: 'elena',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    text: 'Essential frontend design systems in 2026',
    createdAt: '2026-08-20T10:00:00Z',
    likes: 15,
    comments: 2,
    reposts: 1,
  },
  {
    id: 'p2',
    authorId: 'u2',
    author: 'Marcus Vance',
    handle: 'marcus',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    text: 'Advanced TypeScript patterns with React 19',
    createdAt: '2026-08-21T11:00:00Z',
    likes: 28,
    comments: 5,
    reposts: 4,
  },
];

function CreateCollectionModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Create Collection
      </button>

      <CreateCollectionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        savedPosts={sampleSavedPosts}
        onCreate={(name, postIds) => {
          console.log('Collection created:', name, postIds);
          setIsOpen(false);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof CreateCollectionModal> = {
  title: 'Features/Profile/Saved/CreateCollectionModal',
  component: CreateCollectionModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CreateCollectionModal>;

export const Default: Story = {
  render: () => <CreateCollectionModalStoryWrapper />,
};
