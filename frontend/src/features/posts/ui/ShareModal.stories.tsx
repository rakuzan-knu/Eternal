import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import { ShareModal } from './ShareModal';
import { useUIStore, PostType } from '@/shared/model/useUIStore';

const samplePost: PostType = {
  id: 'post-share-1',
  authorId: 'u1',
  author: 'Elena Rostova',
  handle: 'elena',
  avatar:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  text: 'Check out this amazing architectural update!',
  createdAt: '2026-08-21T12:00:00Z',
  likes: 12,
  comments: 3,
  reposts: 2,
};

function ShareModalStoryWrapper() {
  useEffect(() => {
    useUIStore.getState().openShareModal(samplePost);
    return () => {
      useUIStore.getState().closeShareModal();
    };
  }, []);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => useUIStore.getState().openShareModal(samplePost)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Share Modal
      </button>
      <ShareModal />
    </div>
  );
}

const meta: Meta<typeof ShareModal> = {
  title: 'Features/Posts/ShareModal',
  component: ShareModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ShareModal>;

export const Default: Story = {
  render: () => <ShareModalStoryWrapper />,
};
