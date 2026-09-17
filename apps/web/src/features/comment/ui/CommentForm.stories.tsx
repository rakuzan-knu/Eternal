import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CommentForm } from './CommentForm';

const meta: Meta<typeof CommentForm> = {
  title: 'Features/Comment/CommentForm',
  component: CommentForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] max-w-full p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CommentForm>;

export const Default: Story = {
  args: {
    currentUserHandle: 'marcus',
    onSubmitComment: (text, images) => console.log('Comment submit:', text, images),
    isSubmitting: false,
  },
};

export const Submitting: Story = {
  args: {
    currentUserHandle: 'marcus',
    onSubmitComment: (text, images) => console.log('Comment submit:', text, images),
    isSubmitting: true,
  },
};
