import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { FindAccount } from './FindAccount';

const meta: Meta<typeof FindAccount> = {
  title: 'Features/Auth/FindAccount',
  component: FindAccount,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onSuccess: { action: 'success' },
  },
  decorators: [
    (Story) => (
      <div className="w-[380px] max-w-full p-6 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">Find your account</h3>
        <p className="text-xs text-neutral-400 mb-4">
          Enter your registered email address or phone number to search.
        </p>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FindAccount>;

export const Default: Story = {
  args: {
    onSuccess: (userData) => console.log('Found user:', userData),
  },
};
