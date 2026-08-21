import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import { CommentModal } from './CommentModal';
import { useUIStore, PostType } from '@/shared/model/useUIStore';

const samplePost: PostType = {
  id: 'post-100',
  authorId: 'u1',
  author: 'Elena Rostova',
  handle: 'elena',
  avatar:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  text: 'Exploring gradient aesthetics, full Storybook documentation, and high-performance React component patterns! 🚀✨',
  createdAt: '2026-08-21T12:00:00Z',
  likes: 42,
  comments: 8,
  reposts: 5,
  isLiked: true,
  isReposted: false,
  isSaved: false,
  isVerified: true,
  media: [
    {
      id: 'm1',
      type: 'IMAGE',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    },
  ],
};

function CommentModalStoryWrapper() {
  useEffect(() => {
    useUIStore.getState().openCommentModal(samplePost);
    return () => {
      useUIStore.getState().closeCommentModal();
    };
  }, []);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => useUIStore.getState().openCommentModal(samplePost)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Comments Modal
      </button>
      <CommentModal />
    </div>
  );
}

const meta: Meta<typeof CommentModal> = {
  title: 'Features/Comment/CommentModal',
  component: CommentModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CommentModal>;

export const Default: Story = {
  render: () => <CommentModalStoryWrapper />,
};
