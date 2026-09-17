import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  title: 'Features/Auth/LoginForm',
  component: LoginForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full p-8 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {
  args: {
    redirectOnSuccess: false,
    onSuccess: (data) => console.log('Login success:', data),
  },
};
