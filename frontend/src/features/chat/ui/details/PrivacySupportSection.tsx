import React from 'react';
import { Bell, BellOff, ShieldQuestion, Eye, ShieldAlert, Ban, Flag } from 'lucide-react';
import { ExpandableSection, SectionButton } from './SectionButton';

interface PrivacySupportSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isGroup: boolean;
  otherUserId: string | null;
  onBlock: (userId: string) => void;
  onReport: (userId: string) => void;
}

export default function PrivacySupportSection({
  isOpen,
  onToggle,
  isMuted,
  onToggleMute,
  isGroup,
  otherUserId,
  onBlock,
  onReport,
}: PrivacySupportSectionProps) {
  return (
    <ExpandableSection label="Privacy and support" isOpen={isOpen} onToggle={onToggle}>
      <SectionButton
        icon={isMuted ? <Bell size={17} /> : <BellOff size={17} />}
        label={isMuted ? 'Unmute notifications' : 'Mute notifications'}
        onClick={onToggleMute}
      />
      <SectionButton icon={<ShieldQuestion size={17} />} label="Message permissions" />
      <SectionButton icon={<Eye size={17} />} label="Read receipts" sublabel="On" />
      <SectionButton icon={<ShieldAlert size={17} />} label="Restrict" />
      {!isGroup && otherUserId && (
        <SectionButton
          icon={<Ban size={17} />}
          label="Block"
          danger
          onClick={() => onBlock(otherUserId)}
        />
      )}
      {!isGroup && otherUserId && (
        <SectionButton
          icon={<Flag size={17} />}
          label="Report"
          sublabel="Leave feedback and report this conversation"
          danger
          onClick={() => onReport(otherUserId)}
        />
      )}
    </ExpandableSection>
  );
}
