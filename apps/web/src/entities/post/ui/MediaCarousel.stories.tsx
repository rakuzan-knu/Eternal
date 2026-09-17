import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MediaCarousel } from './MediaCarousel';
import { PostMedia } from '../model/types';

const sampleMedia: PostMedia[] = [
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
  {
    id: 'm3',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80',
  },
];

const meta: Meta<typeof MediaCarousel> = {
  title: 'Entities/Post/MediaCarousel',
  component: MediaCarousel,
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
type Story = StoryObj<typeof MediaCarousel>;

export const MultiplePhotos: Story = {
  args: {
    media: sampleMedia,
  },
};
