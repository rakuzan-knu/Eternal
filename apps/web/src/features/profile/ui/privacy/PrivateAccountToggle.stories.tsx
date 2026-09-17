import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import PrivateAccountToggle from './PrivateAccountToggle';

const meta: Meta<typeof PrivateAccountToggle> = {
  title: 'Features/Profile/Privacy/PrivateAccountToggle',
  component: PrivateAccountToggle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[450px] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PrivateAccountToggle>;

export const Default: Story = {};
