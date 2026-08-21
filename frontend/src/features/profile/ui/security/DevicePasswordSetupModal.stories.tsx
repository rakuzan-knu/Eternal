import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import DevicePasswordSetupModal from './DevicePasswordSetupModal';

function DevicePasswordSetupModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Set Passcode
      </button>

      {isOpen && <DevicePasswordSetupModal onClose={() => setIsOpen(false)} />}
    </div>
  );
}

const meta: Meta<typeof DevicePasswordSetupModal> = {
  title: 'Features/Profile/Security/DevicePasswordSetupModal',
  component: DevicePasswordSetupModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DevicePasswordSetupModal>;

export const Default: Story = {
  render: () => <DevicePasswordSetupModalStoryWrapper />,
};
