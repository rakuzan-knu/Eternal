import React from 'react';
import { Bell, BellOff, ShieldQuestion, ShieldAlert, Ban, Flag } from 'lucide-react';
import { ExpandableSection, SectionButton } from './SectionButton';

interface PrivacySupportSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isGroup: boolean;
  otherUserId: string | null;
  onOpenPermissions: () => void;
  onOpenRestrict: () => void;
  onBlock: (userId: string) => void;
  onOpenReport: () => void;
}

export default function PrivacySupportSection({
  isOpen,
  onToggle,
  isMuted,
  onToggleMute,
  isGroup,
  otherUserId,
  onOpenPermissions,
  onOpenRestrict,
  onBlock,
  onOpenReport,
}: PrivacySupportSectionProps) {
  return (
    <ExpandableSection label="Privacy and support" isOpen={isOpen} onToggle={onToggle}>
      <SectionButton
        icon={isMuted ? <Bell size={17} /> : <BellOff size={17} />}
        label={isMuted ? 'Unmute notifications' : 'Mute notifications'}
        onClick={onToggleMute}
      />
      <SectionButton
        icon={<ShieldQuestion size={17} />}
        label="Message permissions"
        onClick={onOpenPermissions}
      />
      <SectionButton icon={<ShieldAlert size={17} />} label="Restrict" onClick={onOpenRestrict} />
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
          onClick={onOpenReport}
        />
      )}
    </ExpandableSection>
  );
}
