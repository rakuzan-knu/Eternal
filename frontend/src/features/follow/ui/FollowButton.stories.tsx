import type { Meta, StoryObj } from '@storybook/react';
import { FollowButton } from './FollowButton';

const meta: Meta<typeof FollowButton> = {
  title: 'Features/Follow/FollowButton',
  component: FollowButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    authorId: { control: 'text' },
    isFollowing: { control: 'boolean' },
    isFriend: { control: 'boolean' },
    followsYou: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof FollowButton>;

export const NotFollowing: Story = {
  args: {
    authorId: 'target-user-1',
    isFollowing: false,
    isFriend: false,
    followsYou: false,
  },
};

export const Following: Story = {
  args: {
    authorId: 'target-user-2',
    isFollowing: true,
    isFriend: false,
    followsYou: false,
  },
};

export const MutualFriends: Story = {
  args: {
    authorId: 'target-user-3',
    isFollowing: true,
    isFriend: true,
    followsYou: true,
  },
};
