import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ReportConversationModal from './ReportConversationModal';

function ReportConversationModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium"
      >
        Report Conversation
      </button>

      {isOpen && (
        <ReportConversationModal
          userId="user-target"
          conversationId="conv-1"
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof ReportConversationModal> = {
  title: 'Features/Chat/ReportConversationModal',
  component: ReportConversationModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ReportConversationModal>;

export const Default: Story = {
  render: () => <ReportConversationModalStoryWrapper />,
};
