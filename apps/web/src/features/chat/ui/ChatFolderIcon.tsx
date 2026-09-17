import React from 'react';
import {
  BellRing,
  Briefcase,
  Crown,
  Flame,
  Folder,
  Gamepad2,
  GraduationCap,
  Heart,
  Home,
  Lightbulb,
  MessageSquare,
  Music,
  Plane,
  Star,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

interface ChatFolderIconProps {
  iconKey: string | null;
  emoji?: string | null;
  color: string;
  size?: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  messagesquare: MessageSquare,
  message: MessageSquare,
  all: MessageSquare,
  user: User,
  personal: User,
  users: Users,
  groups: Users,
  group: Users,
  bellring: BellRing,
  bell: BellRing,
  unread: BellRing,
  flame: Flame,
  folder: Folder,
  heart: Heart,
  star: Star,
  home: Home,
  briefcase: Briefcase,
  game: Gamepad2,
  music: Music,
  plane: Plane,
  study: GraduationCap,
  idea: Lightbulb,
  crown: Crown,
};

// Legacy default emojis that are suppressed in favor of custom SVG icons
const SUPPRESSED_EMOJIS = new Set(['👤', '👥', '🔥', '💼', '📁', '💬']);

export default function ChatFolderIcon({ iconKey, emoji, color, size = 16 }: ChatFolderIconProps) {
  const normalizedKey = iconKey ? iconKey.toLowerCase().replace(/[-_\s]/g, '') : null;
  const ResolvedIcon = normalizedKey ? ICON_MAP[normalizedKey] : null;

  // If a known SVG icon matches, render the custom SVG icon
  if (ResolvedIcon) {
    return (
      <ResolvedIcon
        size={size}
        style={{ color }}
        className="shrink-0 transition-transform group-hover:scale-110"
      />
    );
  }

  // If emoji is provided and not suppressed as a legacy default emoji
  if (emoji && !SUPPRESSED_EMOJIS.has(emoji)) {
    return <span className="text-[15px] leading-none shrink-0">{emoji}</span>;
  }

  // Fallback icon
  return (
    <Folder
      size={size}
      style={{ color }}
      className="shrink-0 transition-transform group-hover:scale-110"
    />
  );
}
