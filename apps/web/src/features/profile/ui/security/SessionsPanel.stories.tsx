import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import SessionsPanel from './SessionsPanel';

const meta: Meta<typeof SessionsPanel> = {
  title: 'Features/Profile/Security/SessionsPanel',
  component: SessionsPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="relative w-[380px] h-[520px] bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SessionsPanel>;

export const Default: Story = {
  args: {
    onClose: () => console.log('Close sessions panel'),
  },
};
