import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import PrivacySettingPanel from './PrivacySettingPanel';

const meta: Meta<typeof PrivacySettingPanel> = {
  title: 'Features/Profile/Privacy/PrivacySettingPanel',
  component: PrivacySettingPanel,
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
type Story = StoryObj<typeof PrivacySettingPanel>;

export const LastSeen: Story = {
  args: {
    dimension: 'LAST_SEEN',
    title: 'Last Seen',
    onClose: () => console.log('Close panel'),
  },
};

export const AvatarVisibility: Story = {
  args: {
    dimension: 'AVATAR',
    title: 'Profile Photo',
    onClose: () => console.log('Close panel'),
  },
};
