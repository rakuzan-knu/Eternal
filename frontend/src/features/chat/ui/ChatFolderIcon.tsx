import React from 'react';
import { folderIconOptions } from '../lib/chatFolderIcons';

interface ChatFolderIconProps {
  iconKey: string | null;
  emoji?: string | null;
  color: string;
  size?: number;
}

export default function ChatFolderIcon({ iconKey, emoji, color, size = 16 }: ChatFolderIconProps) {
  if (emoji) return <span className="text-[15px] leading-none">{emoji}</span>;

  const option = folderIconOptions.find((item) => item.key === iconKey) ?? folderIconOptions[0];
  const Icon = option.icon;
  return <Icon size={size} style={{ color }} />;
}
