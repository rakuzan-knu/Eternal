import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import PrivacyTab from './PrivacyTab';

const meta: Meta<typeof PrivacyTab> = {
  title: 'Features/Profile/Privacy/PrivacyTab',
  component: PrivacyTab,
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
type Story = StoryObj<typeof PrivacyTab>;

export const Default: Story = {};
