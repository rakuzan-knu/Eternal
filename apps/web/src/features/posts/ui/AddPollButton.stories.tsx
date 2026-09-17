import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { AddPollButton } from './AddPollButton';

function AddPollWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  return <AddPollButton isOpen={isOpen} onToggle={() => setIsOpen((v) => !v)} />;
}

const meta: Meta<typeof AddPollButton> = {
  title: 'Features/Posts/AddPollButton',
  component: AddPollButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AddPollButton>;

export const Default: Story = {
  render: () => <AddPollWrapper />,
};
