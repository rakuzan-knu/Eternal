import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import FollowRequestsPanel from './FollowRequestsPanel';

const meta: Meta<typeof FollowRequestsPanel> = {
  title: 'Features/Profile/Privacy/FollowRequestsPanel',
  component: FollowRequestsPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="relative w-[360px] h-[450px] bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FollowRequestsPanel>;

export const Default: Story = {
  args: {
    onClose: () => console.log('Close requests panel'),
  },
};
