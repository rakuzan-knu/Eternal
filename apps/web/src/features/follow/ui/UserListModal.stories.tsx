import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { UserListModal } from './UserListModal';

function UserListModalStoryWrapper({ mode = 'followers' }: { mode?: 'followers' | 'following' }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        View {mode}
      </button>

      {isOpen && (
        <UserListModal
          userId="user-1"
          mode={mode}
          isOwnProfile={true}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof UserListModal> = {
  title: 'Features/Follow/UserListModal',
  component: UserListModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof UserListModal>;

export const Followers: Story = {
  render: () => <UserListModalStoryWrapper mode="followers" />,
};

export const Following: Story = {
  render: () => <UserListModalStoryWrapper mode="following" />,
};
