import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ProfileHeader from './ProfileHeader';

const meta: Meta<typeof ProfileHeader> = {
  title: 'Widgets/Profile/ProfileHeader',
  component: ProfileHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    username: { control: 'text' },
    displayName: { control: 'text' },
    bio: { control: 'text' },
    isOwnProfile: { control: 'boolean' },
    isFollowing: { control: 'boolean' },
    followsYou: { control: 'boolean' },
    isFriend: { control: 'boolean' },
    isVerified: { control: 'boolean' },
    primaryBadge: { control: 'text' },
    followersCount: { control: 'number' },
    followingCount: { control: 'number' },
    onEditClick: { action: 'editClicked' },
  },
  decorators: [
    (Story) => (
      <div className="w-[680px] max-w-full mx-auto bg-[#0b0b0c] min-h-[500px] border-x border-white/5">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileHeader>;

export const OwnProfile: Story = {
  args: {
    userId: 'user-self',
    username: 'alex_creator',
    displayName: 'Alex Carter',
    bio: 'Senior Software Engineer & Distributed Systems Enthusiast. Building the next generation of social applications.',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    banner:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    bannerPosition: 50,
    createdAt: '2024-03-15T00:00:00.000Z',
    isOwnProfile: true,
    isVerified: true,
    primaryBadge: 'DEVELOPER',
    badges: ['DEVELOPER', 'PREMIUM', 'EARLY_SUPPORTER'],
    followersCount: 1420,
    followingCount: 380,
  },
};

export const OtherUserProfileMutual: Story = {
  args: {
    userId: 'user-elena',
    username: 'elena',
    displayName: 'Elena Rostova',
    bio: 'Product Designer & Creative Technologist. Passionate about typography, dark modes, and micro-interactions.',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    banner: null,
    createdAt: '2025-01-10T00:00:00.000Z',
    isOwnProfile: false,
    isFollowing: true,
    followsYou: true,
    isFriend: true,
    isVerified: true,
    primaryBadge: 'PREMIUM',
    badges: ['PREMIUM', 'BETA_TESTER'],
    followersCount: 8900,
    followingCount: 420,
  },
};

export const NotFollowingUser: Story = {
  args: {
    userId: 'user-stranger',
    username: 'marcus',
    displayName: 'Marcus Vance',
    bio: 'Exploring WebAssembly, WebRTC and WebGPU performance optimisations.',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    banner:
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
    createdAt: '2025-06-01T00:00:00.000Z',
    isOwnProfile: false,
    isFollowing: false,
    followsYou: false,
    isFriend: false,
    isVerified: false,
    primaryBadge: 'CONTRIBUTOR',
    badges: ['CONTRIBUTOR'],
    followersCount: 320,
    followingCount: 150,
  },
};
