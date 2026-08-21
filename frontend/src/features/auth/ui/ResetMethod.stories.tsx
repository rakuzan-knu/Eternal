import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ResetMethod } from './ResetMethod';
import { FoundUserResponse } from '../model/types';

const mockUser: FoundUserResponse = {
  id: 'user-1',
  src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  name: 'Elena Rostova',
  role: 'User Account',
  maskedEmail: 'el***@domain.com',
  maskedPhone: '+1 ***-***-8910',
};

const meta: Meta<typeof ResetMethod> = {
  title: 'Features/Auth/ResetMethod',
  component: ResetMethod,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onCancel: { action: 'cancel' },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] max-w-full p-6 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">Reset Password</h3>
        <p className="text-xs text-neutral-400 mb-4">
          Choose how you would like to receive your verification code.
        </p>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ResetMethod>;

export const Default: Story = {
  args: {
    user: mockUser,
    onCancel: () => console.log('Cancel reset'),
  },
};
