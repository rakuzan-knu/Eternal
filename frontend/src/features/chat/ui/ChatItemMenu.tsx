import React from 'react';
import {
  Mail,
  MailOpen,
  BellOff,
  Bell,
  UserRound,
  Pin,
  PinOff,
  Phone,
  Video,
  Ban,
  Archive,
  ArchiveRestore,
  Flag,
} from 'lucide-react';
import DropdownMenu, { DropdownMenuItem } from '../../../shared/ui/DropdownMenu';
import { ConversationView } from '../../../entities/chat/model/types';
import {
  useArchiveConversation,
  useBlockUser,
  useMarkConversationRead,
  useMuteConversation,
  useReportUser,
} from '../../../features/chat/model/useConversationMutations';

interface ChatItemMenuProps {
  conversation: ConversationView;
  otherUserId: string | null;
  isPinnedLocally: boolean;
  isForcedUnread: boolean;
  onClose: () => void;
  onTogglePinLocally: (conversationId: string) => void;
  onToggleUnreadLocally: (conversationId: string) => void;
}

export default function ChatItemMenu({
  conversation,
  otherUserId,
  isPinnedLocally,
  onClose,
  onTogglePinLocally,
  onToggleUnreadLocally,
}: ChatItemMenuProps) {
  const muteConversation = useMuteConversation();
  const archiveConversation = useArchiveConversation();
  const markRead = useMarkConversationRead();
  const blockUser = useBlockUser();
  const reportUser = useReportUser();

  const isMuted = conversation.myMuteLevel !== 'NONE';
  const hasUnread = conversation.unreadCount > 0;

  const items: DropdownMenuItem[] = [
    {
      key: 'read',
      label: hasUnread ? 'Mark as read' : 'Mark as unread',
      icon: hasUnread ? <MailOpen size={18} /> : <Mail size={18} />,
      onClick: () => {
        if (hasUnread) markRead.mutate(conversation.id);
        // No "mark as unread" endpoint exists yet — this only flips a local, non-persisted flag.
        else onToggleUnreadLocally(conversation.id);
      },
    },
    {
      key: 'mute',
      label: isMuted ? 'Unmute notifications' : 'Mute notifications',
      icon: isMuted ? <Bell size={18} /> : <BellOff size={18} />,
      onClick: () =>
        muteConversation.mutate({
          conversationId: conversation.id,
          muteLevel: isMuted ? 'NONE' : 'MESSAGES_AND_CALLS',
        }),
    },
    ...(otherUserId
      ? [
          {
            key: 'profile',
            label: 'View profile',
            icon: <UserRound size={18} />,
            onClick: () => {
              window.location.href = `/${otherUserId}`;
            },
          } satisfies DropdownMenuItem,
        ]
      : []),
    {
      key: 'pin',
      label: isPinnedLocally ? 'Unpin chat' : 'Pin chat',
      icon: isPinnedLocally ? <PinOff size={18} /> : <Pin size={18} />,
      onClick: () => onTogglePinLocally(conversation.id),
    },
    {
      key: 'call',
      label: 'Audio call',
      icon: <Phone size={18} />,
      onClick: () => console.log('audio call — not wired up yet'),
    },
    {
      key: 'video',
      label: 'Video call',
      icon: <Video size={18} />,
      onClick: () => console.log('video call — not wired up yet'),
    },
    ...(otherUserId
      ? [
          {
            key: 'block',
            label: 'Block',
            icon: <Ban size={18} />,
            danger: true,
            divider: true,
            onClick: () => blockUser.mutate(otherUserId),
          } satisfies DropdownMenuItem,
        ]
      : []),
    {
      key: 'archive',
      label: conversation.isArchived ? 'Unarchive chat' : 'Archive chat',
      icon: conversation.isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />,
      danger: !conversation.isArchived,
      onClick: () =>
        archiveConversation.mutate({
          conversationId: conversation.id,
          archived: !conversation.isArchived,
        }),
    },
    ...(otherUserId
      ? [
          {
            key: 'report',
            label: 'Report',
            icon: <Flag size={18} />,
            danger: true,
            onClick: () => reportUser.mutate({ userId: otherUserId, category: 'OTHER' }),
          } satisfies DropdownMenuItem,
        ]
      : []),
  ];

  return <DropdownMenu items={items} onClose={onClose} align="right" />;
}
