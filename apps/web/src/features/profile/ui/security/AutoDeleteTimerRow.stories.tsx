import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import AutoDeleteTimerRow from './AutoDeleteTimerRow';

const meta: Meta<typeof AutoDeleteTimerRow> = {
  title: 'Features/Profile/Security/AutoDeleteTimerRow',
  component: AutoDeleteTimerRow,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden p-2">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AutoDeleteTimerRow>;

export const Default: Story = {};
