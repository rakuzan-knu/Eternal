import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ProgressiveImage } from './ProgressiveImage';

const meta: Meta<typeof ProgressiveImage> = {
  title: 'Shared/UI/ProgressiveImage',
  component: ProgressiveImage,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    src: { control: 'text' },
    blurhash: { control: 'text' },
    aspectRatio: { control: 'number' },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] max-w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProgressiveImage>;

export const Default: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    aspectRatio: 16 / 9,
    alt: 'Progressive showcase',
  },
};

export const WithBlurHash: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
    blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    aspectRatio: 1,
    alt: 'Progressive square image with blurhash',
  },
};
