import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ProfileFieldPreview from './ProfileFieldPreview';

const sampleUser = {
  id: 'u1',
  username: 'elena',
  displayName: 'Elena Rostova',
  avatar:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  banner:
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  bio: 'Building modern web interfaces with elegance.',
};

const meta: Meta<typeof ProfileFieldPreview> = {
  title: 'Features/Profile/Privacy/ProfileFieldPreview',
  component: ProfileFieldPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[380px] max-w-full p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileFieldPreview>;

export const VisibleToAll: Story = {
  args: {
    dimension: 'AVATAR',
    hidden: false,
    value: 'EVERYBODY',
    currentUser: sampleUser,
  },
};

export const HiddenFromStrangers: Story = {
  args: {
    dimension: 'BIO',
    hidden: true,
    value: 'NOBODY',
    currentUser: sampleUser,
  },
};
