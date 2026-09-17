import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { FloatingCards } from './FloatingCards';

const meta: Meta<typeof FloatingCards> = {
  title: 'Pages/Login/FloatingCards',
  component: FloatingCards,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="p-8 bg-[#0b0b0c] flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FloatingCards>;

export const Default: Story = {};
