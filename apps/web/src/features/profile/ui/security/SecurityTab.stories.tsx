import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import SecurityTab from './SecurityTab';

const meta: Meta<typeof SecurityTab> = {
  title: 'Features/Profile/Security/SecurityTab',
  component: SecurityTab,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] max-w-full p-6 bg-neutral-900 border border-neutral-800 rounded-3xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SecurityTab>;

export const Default: Story = {};
