import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import PreviewCard from './PreviewCard';

const meta: Meta<typeof PreviewCard> = {
  title: 'Features/Profile/PreviewCard',
  component: PreviewCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    dimension: {
      control: 'select',
      options: ['AVATAR', 'BANNER', 'BIO', 'LAST_SEEN', 'CALLS'],
    },
    value: { control: 'select', options: ['EVERYBODY', 'CONTACTS', 'NOBODY'] },
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PreviewCard>;

export const AvatarVisible: Story = {
  args: {
    dimension: 'AVATAR',
    value: 'EVERYBODY',
  },
};

export const AvatarHidden: Story = {
  args: {
    dimension: 'AVATAR',
    value: 'NOBODY',
  },
};

export const GenericLastSeen: Story = {
  args: {
    dimension: 'LAST_SEEN',
    value: 'CONTACTS',
  },
};
