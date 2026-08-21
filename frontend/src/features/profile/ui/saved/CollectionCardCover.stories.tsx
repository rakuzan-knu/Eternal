import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CollectionCardCover } from './CollectionCardCover';
import { PostType } from '@/entities/post/model/types';

const samplePost: PostType = {
  id: 'post-1',
  authorId: 'user-marcus',
  author: 'Marcus Vance',
  handle: 'marcus',
  avatar:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  text: 'Exploring modern decentralized protocols and edge computing capabilities with Vite and React 19.',
  createdAt: new Date().toISOString(),
  likes: 42,
  comments: 7,
  reposts: 2,
};

const meta: Meta<typeof CollectionCardCover> = {
  title: 'Features/Profile/CollectionCardCover',
  component: CollectionCardCover,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="relative w-48 h-48 rounded-2xl overflow-hidden border border-neutral-800 shadow-xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CollectionCardCover>;

export const ImageCover: Story = {
  args: {
    coverImg:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  },
};

export const PostPreviewCover: Story = {
  args: {
    post: samplePost,
  },
};

export const EmptyCover: Story = {
  args: {},
};
