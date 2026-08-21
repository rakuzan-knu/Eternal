import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ReportProblemModal } from './ReportProblemModal';

function ReportProblemModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Report Problem
      </button>

      {isOpen && (
        <ReportProblemModal
          onClose={() => setIsOpen(false)}
          onContinue={() => {
            console.log('Continue to report');
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof ReportProblemModal> = {
  title: 'Features/Sidebar/ReportProblemModal',
  component: ReportProblemModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ReportProblemModal>;

export const Default: Story = {
  render: () => <ReportProblemModalStoryWrapper />,
};
