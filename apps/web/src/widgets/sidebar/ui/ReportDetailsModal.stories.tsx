import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ReportDetailsModal } from './ReportDetailsModal';

function ReportDetailsModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"
      >
        Submit Bug Report
      </button>

      {isOpen && (
        <ReportDetailsModal onClose={() => setIsOpen(false)} onBack={() => setIsOpen(false)} />
      )}
    </div>
  );
}

const meta: Meta<typeof ReportDetailsModal> = {
  title: 'Features/Sidebar/ReportDetailsModal',
  component: ReportDetailsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ReportDetailsModal>;

export const Default: Story = {
  render: () => <ReportDetailsModalStoryWrapper />,
};
