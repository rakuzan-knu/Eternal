import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ArchivePasswordGate from './ArchivePasswordGate';

const meta: Meta<typeof ArchivePasswordGate> = {
  title: 'Features/Chat/ArchivePasswordGate',
  component: ArchivePasswordGate,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full p-6 bg-[#16171d] border border-white/10 rounded-3xl shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ArchivePasswordGate>;

export const Default: Story = {
  args: {
    onUnlock: () => console.log('Archive unlocked!'),
  },
};
