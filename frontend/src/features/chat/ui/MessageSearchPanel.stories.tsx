import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import MessageSearchPanel from './MessageSearchPanel';

const meta: Meta<typeof MessageSearchPanel> = {
  title: 'Features/Chat/MessageSearchPanel',
  component: MessageSearchPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[340px] h-[500px] bg-[#16161a] border border-white/10 rounded-2xl overflow-hidden">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageSearchPanel>;

export const Default: Story = {
  args: {
    conversationId: 'conv-1',
    onClose: () => console.log('Close search panel'),
    onJumpToMessage: (id) => console.log('Jump to message:', id),
  },
};
