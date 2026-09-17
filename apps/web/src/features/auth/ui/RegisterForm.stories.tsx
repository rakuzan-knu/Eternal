import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { RegisterForm } from './RegisterForm';

const meta: Meta<typeof RegisterForm> = {
  title: 'Features/Auth/RegisterForm',
  component: RegisterForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[440px] max-w-full p-8 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RegisterForm>;

export const Default: Story = {
  args: {
    onSuccess: (data) => console.log('Registration success:', data),
  },
};
