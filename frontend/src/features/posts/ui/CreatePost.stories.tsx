import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import CreatePost from './CreatePost';

const meta: Meta<typeof CreatePost> = {
  title: 'Features/Posts/CreatePost',
  component: CreatePost,
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
type Story = StoryObj<typeof CreatePost>;

export const Default: Story = {
  args: {
    onSubmitFormData: (fd) => console.log('Submitted form data:', fd),
    isPending: false,
  },
};

export const Pending: Story = {
  args: {
    onSubmitFormData: (fd) => console.log('Submitted form data:', fd),
    isPending: true,
  },
};
