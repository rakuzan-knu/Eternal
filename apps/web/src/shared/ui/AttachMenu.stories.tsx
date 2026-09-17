import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import AttachMenu from './AttachMenu';

const meta: Meta<typeof AttachMenu> = {
  title: 'Shared/UI/AttachMenu',
  component: AttachMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    isGroup: { control: 'boolean' },
    canSendMedia: { control: 'boolean' },
    canSendPolls: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onPickMedia: { action: 'pickMedia' },
    onPickFile: { action: 'pickFile' },
    onTogglePoll: { action: 'togglePoll' },
  },
  decorators: [
    (Story) => (
      <div className="p-20 flex justify-center items-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AttachMenu>;

export const DirectChat: Story = {
  args: {
    isGroup: false,
    canSendMedia: true,
    canSendPolls: false,
  },
};

export const GroupChat: Story = {
  args: {
    isGroup: true,
    canSendMedia: true,
    canSendPolls: true,
  },
};

export const RestrictedMedia: Story = {
  args: {
    isGroup: true,
    canSendMedia: false,
    canSendPolls: true,
  },
};
