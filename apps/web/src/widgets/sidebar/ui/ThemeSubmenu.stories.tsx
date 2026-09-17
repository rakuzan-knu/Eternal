import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ThemeMenuItem } from './ThemeSubmenu';

const meta: Meta<typeof ThemeMenuItem> = {
  title: 'Features/Sidebar/ThemeSubmenu',
  component: ThemeMenuItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[280px] p-4 bg-neutral-950 border border-neutral-800 rounded-2xl relative">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ThemeMenuItem>;

export const Default: Story = {};
