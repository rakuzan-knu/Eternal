import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import LocalDevicePasswordGate from './LocalDevicePasswordGate';

const meta: Meta<typeof LocalDevicePasswordGate> = {
  title: 'Features/Profile/Security/LocalDevicePasswordGate',
  component: LocalDevicePasswordGate,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[450px] max-w-full p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LocalDevicePasswordGate>;

export const Default: Story = {};
