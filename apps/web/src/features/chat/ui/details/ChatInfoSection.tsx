import React from 'react';
import { Pin, Image as ImageIcon, FileText, Link as LinkIcon } from 'lucide-react';
import { ExpandableSection, SectionButton } from './SectionButton';

interface ChatInfoSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  pinnedCount: number;
  mediaCount: number;
  fileCount: number;
  linkCount: number;
  onOpenPinned: () => void;
  onOpenGallery: (tab: 'media' | 'files' | 'links') => void;
}

export default function ChatInfoSection({
  isOpen,
  onToggle,
  pinnedCount,
  mediaCount,
  fileCount,
  linkCount,
  onOpenPinned,
  onOpenGallery,
}: ChatInfoSectionProps) {
  return (
    <ExpandableSection label="Chat info" isOpen={isOpen} onToggle={onToggle}>
      <SectionButton
        icon={<Pin size={17} />}
        label="Pinned messages"
        sublabel={`${pinnedCount}`}
        onClick={onOpenPinned}
      />
      <SectionButton
        icon={<ImageIcon size={17} />}
        label="Media"
        sublabel={`${mediaCount} loaded`}
        onClick={() => onOpenGallery('media')}
      />
      <SectionButton
        icon={<FileText size={17} />}
        label="Files"
        sublabel={`${fileCount} loaded`}
        onClick={() => onOpenGallery('files')}
      />
      <SectionButton
        icon={<LinkIcon size={17} />}
        label="Links"
        sublabel={`${linkCount} loaded`}
        onClick={() => onOpenGallery('links')}
      />
    </ExpandableSection>
  );
}
