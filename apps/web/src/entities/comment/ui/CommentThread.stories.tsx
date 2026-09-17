import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CommentThread } from './CommentThread';
import { CommentType } from '../model/types';

const rootComment: CommentType = {
  id: 'comment-root-1',
  postId: 'post-100',
  userId: 'user-1',
  author: 'Sarah Connor',
  handle: 'sarah',
  avatar:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  text: 'How does the new optimistic updates architecture work with nested comment replies?',
  time: '1h ago',
  likesCount: 8,
  isLiked: true,
  isVerified: true,
  replyCount: 2,
};

const meta: Meta<typeof CommentThread> = {
  title: 'Entities/Comment/CommentThread',
  component: CommentThread,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[560px] max-w-full p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CommentThread>;

export const CollapsedReplies: Story = {
  args: {
    comment: rootComment,
    autoExpand: false,
  },
};

export const AutoExpanded: Story = {
  args: {
    comment: rootComment,
    autoExpand: true,
  },
};
