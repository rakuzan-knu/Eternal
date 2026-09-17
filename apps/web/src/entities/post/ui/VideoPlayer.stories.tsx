import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { VideoPlayer } from './VideoPlayer';

const meta: Meta<typeof VideoPlayer> = {
  title: 'Entities/Post/VideoPlayer',
  component: VideoPlayer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    src: { control: 'text' },
    poster: { control: 'text' },
    active: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] max-w-full aspect-video rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof VideoPlayer>;

export const Default: Story = {
  args: {
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    poster:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    active: true,
  },
};
