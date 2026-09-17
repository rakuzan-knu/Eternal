import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PostMenu } from './PostMenu';

const meta: Meta<typeof PostMenu> = {
  title: 'Features/Posts/PostMenu',
  component: PostMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="p-20 relative h-[360px] flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PostMenu>;

export const OwnerView: Story = {
  args: {
    postId: 'post-1',
    isOwner: true,
    isSaved: false,
    isPinned: false,
    onSave: () => console.log('Save'),
    onDelete: () => console.log('Delete'),
    onEdit: () => console.log('Edit'),
    onTogglePin: () => console.log('Toggle pin'),
  },
};

export const OtherUserView: Story = {
  args: {
    postId: 'post-2',
    isOwner: false,
    isSaved: true,
    isPinned: false,
    onSave: () => console.log('Save'),
    onReport: () => console.log('Report'),
    onBlockAuthor: () => console.log('Block author'),
  },
};
