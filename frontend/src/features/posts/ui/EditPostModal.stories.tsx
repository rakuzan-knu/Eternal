import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { EditPostModal } from './EditPostModal';
import { PostType } from '@/entities/post/model/types';

const samplePost: PostType = {
  id: 'post-1',
  authorId: 'user-1',
  author: 'Elena Rostova',
  handle: 'elena',
  avatar:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  text: 'Excited to showcase our complete Storybook component library! 🎨 #frontend #react',
  createdAt: '2026-08-21T10:00:00Z',
  likes: 10,
  comments: 2,
  reposts: 1,
};

function EditPostModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Edit Post Modal
      </button>

      <EditPostModal
        post={samplePost}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={(newText) => {
          console.log('Saved post text:', newText);
          setIsOpen(false);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof EditPostModal> = {
  title: 'Features/Posts/EditPostModal',
  component: EditPostModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof EditPostModal>;

export const Default: Story = {
  render: () => <EditPostModalStoryWrapper />,
};
