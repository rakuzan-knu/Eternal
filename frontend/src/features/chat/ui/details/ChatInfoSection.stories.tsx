import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ChatInfoSection from './ChatInfoSection';

function ChatInfoSectionStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="w-[320px] max-w-full bg-[#181926] border border-white/10 rounded-2xl p-3 shadow-xl">
      <ChatInfoSection
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        pinnedCount={3}
        mediaCount={24}
        fileCount={8}
        linkCount={15}
        onOpenPinned={() => console.log('Open pinned')}
        onOpenGallery={(tab) => console.log('Open gallery tab:', tab)}
      />
    </div>
  );
}

const meta: Meta<typeof ChatInfoSection> = {
  title: 'Features/Chat/Details/ChatInfoSection',
  component: ChatInfoSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ChatInfoSection>;

export const Default: Story = {
  render: () => <ChatInfoSectionStoryWrapper />,
};
