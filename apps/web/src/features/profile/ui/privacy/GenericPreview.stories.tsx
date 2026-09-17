import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import GenericPreview from './GenericPreview';

const meta: Meta<typeof GenericPreview> = {
  title: 'Features/Profile/Privacy/GenericPreview',
  component: GenericPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[360px] max-w-full p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GenericPreview>;

export const Everybody: Story = {
  args: {
    dimension: 'LAST_SEEN',
    value: 'EVERYBODY',
    hidden: false,
  },
};

export const ContactsOnly: Story = {
  args: {
    dimension: 'MESSAGES',
    value: 'CONTACTS',
    hidden: false,
  },
};

export const Nobody: Story = {
  args: {
    dimension: 'CALLS',
    value: 'NOBODY',
    hidden: true,
  },
};
