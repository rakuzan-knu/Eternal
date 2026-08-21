import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import RestrictedAccountsPanel from './RestrictedAccountsPanel';

const meta: Meta<typeof RestrictedAccountsPanel> = {
  title: 'Features/Chat/RestrictedAccountsPanel',
  component: RestrictedAccountsPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="relative w-[360px] h-[500px] bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RestrictedAccountsPanel>;

export const Default: Story = {
  args: {
    onClose: () => console.log('Close restricted accounts panel'),
  },
};
