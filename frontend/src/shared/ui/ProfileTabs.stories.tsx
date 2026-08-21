import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ProfileTabs, { ProfileTabType } from './ProfileTabs';

function ProfileTabsWrapper(props: { initialTab?: ProfileTabType; showSavedTab?: boolean }) {
  const [activeTab, setActiveTab] = useState<ProfileTabType>(props.initialTab ?? 'posts');

  return (
    <div className="w-[500px] max-w-full bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
      <ProfileTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showSavedTab={props.showSavedTab}
      />
    </div>
  );
}

const meta: Meta<typeof ProfileTabs> = {
  title: 'Shared/UI/ProfileTabs',
  component: ProfileTabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    activeTab: { control: 'select', options: ['posts', 'reposts', 'saved'] },
    showSavedTab: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileTabs>;

export const DefaultPosts: Story = {
  render: () => <ProfileTabsWrapper initialTab="posts" showSavedTab={true} />,
};

export const RepostsActive: Story = {
  render: () => <ProfileTabsWrapper initialTab="reposts" showSavedTab={true} />,
};

export const SavedActive: Story = {
  render: () => <ProfileTabsWrapper initialTab="saved" showSavedTab={true} />,
};

export const WithoutSavedTab: Story = {
  render: () => <ProfileTabsWrapper initialTab="posts" showSavedTab={false} />,
};
