import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import DeviceLockGate from './DeviceLockGate';
import { useDevicePasswordStore } from '../../model/useDevicePasswordStore';

function DeviceLockGateStoryWrapper() {
  useEffect(() => {
    useDevicePasswordStore.setState({
      stored: {
        hash: 'mock-hash',
        salt: 'mock-salt',
        algo: 'PBKDF2',
      },
      unlocked: false,
    });

    return () => {
      useDevicePasswordStore.getState().disable();
    };
  }, []);

  return (
    <DeviceLockGate>
      <div className="p-8 text-center text-emerald-400 font-bold">
        Application Unlocked Content!
      </div>
    </DeviceLockGate>
  );
}

const meta: Meta<typeof DeviceLockGate> = {
  title: 'Features/Profile/Security/DeviceLockGate',
  component: DeviceLockGate,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DeviceLockGate>;

export const Locked: Story = {
  render: () => <DeviceLockGateStoryWrapper />,
};
