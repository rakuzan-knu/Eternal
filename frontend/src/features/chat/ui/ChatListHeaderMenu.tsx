import React from 'react';
import { Settings, Inbox, Archive, UserX, Lock, HelpCircle } from 'lucide-react';
import DropdownMenu, { DropdownMenuItem } from '../../../shared/ui/DropdownMenu';

export type ChatListHeaderSection =
  'settings' | 'requests' | 'archive' | 'restricted' | 'privacy' | 'help';

interface ChatListHeaderMenuProps {
  onClose: () => void;
  archivedCount?: number;
  onOpen: (section: ChatListHeaderSection) => void;
}

export default function ChatListHeaderMenu({
  onClose,
  archivedCount = 0,
  onOpen,
}: ChatListHeaderMenuProps) {
  const items: DropdownMenuItem[] = [
    {
      key: 'settings',
      label: 'Settings',
      icon: <Settings size={18} />,
      onClick: () => onOpen('settings'),
    },
    {
      key: 'requests',
      label: 'Requests',
      icon: <Inbox size={18} />,
      onClick: () => onOpen('requests'),
    },
    {
      key: 'archive',
      label: 'Archived chats',
      icon: <Archive size={18} />,
      badge: archivedCount > 0 ? archivedCount : undefined,
      onClick: () => onOpen('archive'),
    },
    {
      key: 'restricted',
      label: 'Restricted accounts',
      icon: <UserX size={18} />,
      onClick: () => onOpen('restricted'),
    },
    {
      key: 'privacy',
      label: 'Privacy and safety',
      icon: <Lock size={18} />,
      hasSubmenu: true,
      onClick: () => onOpen('privacy'),
    },
    {
      key: 'help',
      label: 'Help',
      icon: <HelpCircle size={18} />,
      onClick: () => onOpen('help'),
    },
  ];

  return <DropdownMenu items={items} onClose={onClose} align="left" />;
}
