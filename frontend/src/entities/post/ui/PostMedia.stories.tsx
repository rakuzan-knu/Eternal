import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PostMedia } from './PostMedia';
import { PostMedia as PostMediaType } from '../model/types';

const sampleImages: PostMediaType[] = [
  {
    id: '1',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
  },
  {
    id: '2',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: '3',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: '4',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: '5',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
  },
];

const meta: Meta<typeof PostMedia> = {
  title: 'Entities/Post/PostMedia',
  component: PostMedia,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] max-w-full p-2">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PostMedia>;

export const SingleImage: Story = {
  args: {
    media: [sampleImages[0]],
  },
};

export const TwoImagesGrid: Story = {
  args: {
    media: sampleImages.slice(0, 2),
  },
};

export const ThreeImagesGrid: Story = {
  args: {
    media: sampleImages.slice(0, 3),
  },
};

export const FourPlusImagesWithCounter: Story = {
  args: {
    media: sampleImages,
  },
};
