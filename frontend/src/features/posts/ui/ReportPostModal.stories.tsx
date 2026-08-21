import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ReportPostModal } from './ReportPostModal';

function ReportPostModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"
      >
        Report Post
      </button>

      <ReportPostModal postId="post-10" isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

const meta: Meta<typeof ReportPostModal> = {
  title: 'Features/Posts/ReportPostModal',
  component: ReportPostModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ReportPostModal>;

export const Default: Story = {
  render: () => <ReportPostModalStoryWrapper />,
};
