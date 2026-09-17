import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import PrivacyDimensionRow from './PrivacyDimensionRow';

const samplePrivacy = {
  lastSeen: 'EVERYBODY',
  avatar: 'CONTACTS',
  bio: 'EVERYBODY',
  birthday: 'NOBODY',
  messages: 'EVERYBODY',
  calls: 'CONTACTS',
  voiceMessages: 'EVERYBODY',
  forwardLink: 'EVERYBODY',
  groupInvites: 'CONTACTS',
  isPrivate: false,
  allowNearbyRecommendations: true,
} as any;

const meta: Meta<typeof PrivacyDimensionRow> = {
  title: 'Features/Profile/Privacy/PrivacyDimensionRow',
  component: PrivacyDimensionRow,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PrivacyDimensionRow>;

export const Default: Story = {
  args: {
    dimension: 'LAST_SEEN',
    title: 'Last Seen',
    privacy: samplePrivacy,
    onClick: () => console.log('Row clicked'),
    last: false,
  },
};

export const LoadingState: Story = {
  args: {
    dimension: 'BIRTHDAY',
    title: 'Birthday',
    privacy: undefined,
    isLoading: true,
    onClick: () => console.log('Row clicked'),
    last: true,
  },
};
