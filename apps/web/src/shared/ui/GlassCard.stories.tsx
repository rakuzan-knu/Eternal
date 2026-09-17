import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { GlassCard } from './GlassCard';

const meta: Meta<typeof GlassCard> = {
  title: 'Shared/UI/GlassCard',
  component: GlassCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof GlassCard>;

export const Default: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-bold text-white">Glassmorphism Card</h3>
        <p className="text-sm text-neutral-400">
          This card features backdrop-blur, semi-transparent borders and deep drop shadows.
        </p>
        <button
          type="button"
          className="mt-2 w-fit px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm rounded-xl transition cursor-pointer"
        >
          Action Button
        </button>
      </div>
    ),
  },
};
