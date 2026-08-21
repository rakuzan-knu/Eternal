import type { Meta, StoryObj } from '@storybook/react';
import GroupAvatarCollage from './GroupAvatarCollage';

const sampleAvatars = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
];

const meta: Meta<typeof GroupAvatarCollage> = {
  title: 'Shared/UI/GroupAvatarCollage',
  component: GroupAvatarCollage,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: { control: { type: 'range', min: 32, max: 128, step: 4 } },
  },
};

export default meta;
type Story = StoryObj<typeof GroupAvatarCollage>;

export const SingleAvatar: Story = {
  args: {
    avatars: [sampleAvatars[0]],
    size: 56,
  },
};

export const TwoAvatars: Story = {
  args: {
    avatars: sampleAvatars.slice(0, 2),
    size: 56,
  },
};

export const ThreeAvatars: Story = {
  args: {
    avatars: sampleAvatars.slice(0, 3),
    size: 56,
  },
};

export const FourAvatars: Story = {
  args: {
    avatars: sampleAvatars,
    size: 64,
  },
};
