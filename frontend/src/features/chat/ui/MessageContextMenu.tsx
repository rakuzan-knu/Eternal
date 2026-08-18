import React from 'react';
import { Pencil, Trash2, Forward, Pin, PinOff, Flag, CheckSquare } from 'lucide-react';
import DropdownMenu, { DropdownMenuItem } from '../../../shared/ui/DropdownMenu';
import { MessageView } from '../../../entities/chat/model/types';

interface MessageContextMenuProps {
  message: MessageView;
  isOwnMessage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onForward: () => void;
  onTogglePin: () => void;
  onReport: () => void;
  onSelectMessage?: () => void;
  align?: 'left' | 'right';
}

export default function MessageContextMenu({
  message,
  isOwnMessage,
  onClose,
  onEdit,
  onDelete,
  onForward,
  onTogglePin,
  onReport,
  onSelectMessage,
  align = 'left',
}: MessageContextMenuProps) {
  const items: DropdownMenuItem[] = [
    ...(onSelectMessage
      ? [
          {
            key: 'select',
            label: 'Select',
            icon: <CheckSquare size={16} />,
            onClick: onSelectMessage,
          } satisfies DropdownMenuItem,
        ]
      : []),
    ...(isOwnMessage
      ? [
          {
            key: 'edit',
            label: 'Edit',
            icon: <Pencil size={16} />,
            onClick: onEdit,
          } satisfies DropdownMenuItem,
        ]
      : []),
    {
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 size={16} />,
      danger: true,
      onClick: onDelete,
    },
    {
      key: 'forward',
      label: 'Forward',
      icon: <Forward size={16} />,
      onClick: onForward,
    },
    {
      key: 'pin',
      label: message.isPinned ? 'Unpin' : 'Pin',
      icon: message.isPinned ? <PinOff size={16} /> : <Pin size={16} />,
      onClick: onTogglePin,
    },
    ...(!isOwnMessage
      ? [
          {
            key: 'report',
            label: 'Report',
            icon: <Flag size={16} />,
            danger: true,
            onClick: onReport,
          } satisfies DropdownMenuItem,
        ]
      : []),
  ];

  return <DropdownMenu items={items} onClose={onClose} align={align} className="min-w-[180px]" />;
}
