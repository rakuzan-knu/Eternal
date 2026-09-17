import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Lock, Moon, Trash2 } from 'lucide-react';

import SettingsRow from './SettingsRow';

const meta: Meta<typeof SettingsRow> = {
  title: 'Shared/UI/SettingsRow',
  component: SettingsRow,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    value: { control: 'text' },
    danger: { control: 'boolean' },
    last: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SettingsRow>;

export const Standard: Story = {
  args: {
    icon: <Lock size={18} />,
    title: 'Password & Security',
    subtitle: 'Manage your password, devices and 2FA authentication',
    onClick: () => {},
  },
};

export const WithValue: Story = {
  args: {
    icon: <Moon size={18} />,
    title: 'Appearance',
    subtitle: 'Choose between dark and light color palettes',
    value: 'Dark theme',
    onClick: () => {},
  },
};

export const DangerVariant: Story = {
  args: {
    icon: <Trash2 size={18} />,
    title: 'Delete Account',
    subtitle: 'Permanently remove your account and all data',
    danger: true,
    last: true,
    onClick: () => {},
  },
};
