import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import PrivacySupportSection from './PrivacySupportSection';

function PrivacySupportSectionStoryWrapper({ isGroup = false }: { isGroup?: boolean }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="w-[320px] max-w-full bg-[#181926] border border-white/10 rounded-2xl p-3 shadow-xl">
      <PrivacySupportSection
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        isGroup={isGroup}
        otherUserId={isGroup ? null : 'user-target'}
        onOpenPermissions={() => console.log('Open permissions')}
        onOpenRestrict={() => console.log('Open restrict')}
        onBlock={(id) => console.log('Block user:', id)}
        onOpenReport={() => console.log('Open report')}
      />
    </div>
  );
}

const meta: Meta<typeof PrivacySupportSection> = {
  title: 'Features/Chat/Details/PrivacySupportSection',
  component: PrivacySupportSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PrivacySupportSection>;

export const DirectChat: Story = {
  render: () => <PrivacySupportSectionStoryWrapper isGroup={false} />,
};

export const GroupChat: Story = {
  render: () => <PrivacySupportSectionStoryWrapper isGroup={true} />,
};
