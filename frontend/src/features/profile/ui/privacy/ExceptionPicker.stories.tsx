import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ExceptionPicker from './ExceptionPicker';

const meta: Meta<typeof ExceptionPicker> = {
  title: 'Features/Profile/Privacy/ExceptionPicker',
  component: ExceptionPicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[360px] max-w-full p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ExceptionPicker>;

export const AllowMode: Story = {
  args: {
    dimension: 'LAST_SEEN',
    mode: 'ALLOW',
  },
};

export const DenyMode: Story = {
  args: {
    dimension: 'LAST_SEEN',
    mode: 'DENY',
  },
};
