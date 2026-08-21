import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import Banner from './Banner';

const meta: Meta<typeof Banner> = {
  title: 'Shared/UI/Banner',
  component: Banner,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    src: { control: 'text' },
    positionY: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    alt: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div className="w-[600px] max-w-full h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const DefaultGradient: Story = {
  args: {
    src: null,
    positionY: 50,
    alt: 'Default gradient banner',
  },
};

export const CustomImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    positionY: 50,
    alt: 'Abstract gradient banner',
  },
};

export const RepositionedY: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
    positionY: 80,
    alt: 'Repositioned banner',
  },
};

export const BrokenImageFallback: Story = {
  args: {
    src: 'https://invalid-url.example.com/banner.jpg',
    positionY: 50,
    alt: 'Broken image fallback',
  },
};
