import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import EditProfileModal from './EditProfileModal';
import { useUIStore } from '@/shared/model/useUIStore';

function EditProfileModalStoryWrapper({
  initialTab,
}: {
  initialTab?: 'account' | 'appearance' | 'security' | 'privacy' | 'notifications';
}) {
  useEffect(() => {
    useUIStore.getState().openEditProfile(initialTab);
    return () => {
      useUIStore.getState().closeEditProfile();
    };
  }, [initialTab]);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => useUIStore.getState().openEditProfile(initialTab)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Settings ({initialTab || 'account'})
      </button>
      <EditProfileModal />
    </div>
  );
}

const meta: Meta<typeof EditProfileModal> = {
  title: 'Features/Profile/EditProfileModal',
  component: EditProfileModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof EditProfileModal>;

export const AccountTab: Story = {
  render: () => <EditProfileModalStoryWrapper initialTab="account" />,
};

export const AppearanceTab: Story = {
  render: () => <EditProfileModalStoryWrapper initialTab="appearance" />,
};

export const SecurityTab: Story = {
  render: () => <EditProfileModalStoryWrapper initialTab="security" />,
};
