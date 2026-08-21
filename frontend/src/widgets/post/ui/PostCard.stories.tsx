import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PostCard } from './PostCard';
import { PostType } from '@/shared/model/useUIStore';

const sampleTextPost: PostType = {
  id: 'post-1',
  authorId: 'user-1',
  author: 'Elena Rostova',
  handle: 'elena',
  avatar:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  text: 'Excited to announce our major update! We added full Storybook documentation and automated interaction test coverage across all layers of the application. 🚀✨ #frontend #release',
  createdAt: new Date().toISOString(),
  likes: 24,
  comments: 6,
  reposts: 3,
  isLiked: false,
  isReposted: false,
  isSaved: false,
  isVerified: true,
  primaryBadge: 'DEVELOPER',
};

const sampleMediaPost: PostType = {
  ...sampleTextPost,
  id: 'post-2',
  text: 'Exploring gradient aesthetics and glassmorphic user interfaces in modern web development.',
  media: [
    {
      id: 'm1',
      type: 'IMAGE',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    },
    {
      id: 'm2',
      type: 'IMAGE',
      url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000&auto=format&fit=crop&q=80',
    },
  ],
};

const samplePollPost: PostType = {
  ...sampleTextPost,
  id: 'post-3',
  text: 'Community poll: Which state management tool do you prefer with React 19?',
  poll: {
    id: 'poll-10',
    title: 'State management choice',
    totalVotes: 89,
    myVoteOptionId: null,
    options: [
      { id: 'opt-1', text: 'Zustand + TanStack Query', votes: 64 },
      { id: 'opt-2', text: 'Redux Toolkit', votes: 15 },
      { id: 'opt-3', text: 'React Context', votes: 10 },
    ],
  },
};

const meta: Meta<typeof PostCard> = {
  title: 'Widgets/Post/PostCard',
  component: PostCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[560px] max-w-full p-4 bg-[#0b0b0c]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PostCard>;

export const TextPost: Story = {
  args: {
    post: sampleTextPost,
    queryKey: ['posts'],
  },
};

export const MediaPost: Story = {
  args: {
    post: sampleMediaPost,
    queryKey: ['posts'],
  },
};

export const PollPost: Story = {
  args: {
    post: samplePollPost,
    queryKey: ['posts'],
  },
};
