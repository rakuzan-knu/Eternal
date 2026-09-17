import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CommentItem } from './CommentItem';
import { CommentType } from '../model/types';

const sampleComment: CommentType = {
  id: 'comment-1',
  postId: 'post-100',
  userId: 'user-1',
  author: 'Alice Cooper',
  handle: 'alice',
  avatar:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  text: 'This is an amazing update! The micro-animations and performance feel buttery smooth. #frontend',
  time: '2h ago',
  likesCount: 14,
  isLiked: false,
  isVerified: true,
  primaryBadge: 'DEVELOPER',
  isPinned: false,
  replyCount: 3,
};

const meta: Meta<typeof CommentItem> = {
  title: 'Entities/Comment/CommentItem',
  component: CommentItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    isReply: { control: 'boolean' },
    onReply: { action: 'reply' },
    onDelete: { action: 'delete' },
    onPin: { action: 'pin' },
    onLike: { action: 'like' },
    onReport: { action: 'report' },
  },
  decorators: [
    (Story) => (
      <div className="w-[540px] max-w-full p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CommentItem>;

export const Default: Story = {
  args: {
    comment: sampleComment,
  },
};

export const PinnedComment: Story = {
  args: {
    comment: {
      ...sampleComment,
      id: 'comment-pinned',
      isPinned: true,
      text: '📌 Community Announcement: Please adhere to respectful communication guidelines!',
    },
    postAuthorId: 'user-author',
    currentUserId: 'user-author',
  },
};

export const AuthorComment: Story = {
  args: {
    comment: {
      ...sampleComment,
      id: 'comment-author',
      userId: 'user-author',
      author: 'Post Creator',
      handle: 'creator',
      isLikedByAuthor: true,
    },
    postAuthorId: 'user-author',
  },
};

export const WithMediaAttachment: Story = {
  args: {
    comment: {
      ...sampleComment,
      id: 'comment-media',
      mediaUrl:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    },
  },
};

export const DeletedState: Story = {
  args: {
    comment: {
      ...sampleComment,
      id: 'comment-deleted',
      isDeleted: true,
    },
  },
};
