import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  MailOpen,
  BellOff,
  Bell,
  UserRound,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  SlidersHorizontal,
  VolumeX,
  Clock,
  FolderPlus,
  Eraser,
  AppWindow,
  Check,
} from 'lucide-react';
import DropdownMenu, { DropdownMenuItem } from '../../../shared/ui/DropdownMenu';
import { ConversationView } from '../../../entities/chat/model/types';
import {
  useArchiveConversation,
  useClearChatHistory,
  useDeleteConversation,
  useMarkConversationRead,
  useMuteConversation,
} from '../../../features/chat/model/useConversationMutations';
import { useChatFoldersStore } from '../../../features/chat/model/useChatFoldersStore';
import MuteOptionsModal from './MuteOptionsModal';
import SelectToneModal from './SelectToneModal';
import DeleteChatHistoryModal from './DeleteChatHistoryModal';
import DeleteChatModal from './DeleteChatModal';

interface ChatItemMenuProps {
  conversation: ConversationView;
  otherUserId: string | null;
  otherUsername?: string | null;
  conversationTitle?: string;
  avatarUrl?: string | null;
  isGroup?: boolean;
  memberAvatars?: (string | null)[];
  isPinnedLocally: boolean;
  isForcedUnread: boolean;
  onClose: () => void;
  onTogglePinLocally: (conversationId: string) => void;
  onToggleUnreadLocally: (conversationId: string) => void;
  onMarkReadLocally?: (conversationId: string) => void;
  onCreateFolder?: () => void;
}

export default function ChatItemMenu({
  conversation,
  otherUserId,
  otherUsername,
  conversationTitle = 'Chat',
  avatarUrl = null,
  isGroup = false,
  memberAvatars = [],
  isPinnedLocally,
  isForcedUnread,
  onClose,
  onTogglePinLocally,
  onToggleUnreadLocally,
  onMarkReadLocally,
  onCreateFolder,
}: ChatItemMenuProps) {
  const navigate = useNavigate();
  const muteConversation = useMuteConversation();
  const archiveConversation = useArchiveConversation();
  const markRead = useMarkConversationRead();
  const deleteConversation = useDeleteConversation();
  const clearChatHistory = useClearChatHistory();

  const { folders, toggleConversationInFolder } = useChatFoldersStore();

  const [activeModal, setActiveModal] = useState<
    'muteOptions' | 'selectTone' | 'clearHistory' | 'deleteChat' | null
  >(null);

  const isMuted = conversation.myMuteLevel !== 'NONE';
  const hasUnread = conversation.unreadCount > 0 || isForcedUnread;

  const handleOpenInNewWindow = () => {
    const width = 460;
    const height = 680;
    const left = Math.max(0, window.screen.availWidth - width - 50);
    const top = 50;
    const popup = window.open(
      `/messages/standalone/${conversation.id}`,
      `chat_standalone_${conversation.id}`,
      `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer,status=no,menubar=no,toolbar=no,location=no,resizable=yes`,
    );
    if (popup) {
      popup.opener = null;
    }
  };

  // Build folder submenu items
  const folderSubmenuItems: DropdownMenuItem[] = [
    ...folders.map((folder) => {
      const isIncluded = folder.includeIds.includes(conversation.id);
      return {
        key: `folder-${folder.id}`,
        label: folder.name,
        icon: (
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: folder.color || '#60a5fa' }}
          />
        ),
        checked: isIncluded,
        onClick: () => {
          toggleConversationInFolder(folder.id, conversation.id);
        },
      };
    }),
    ...(onCreateFolder
      ? [
          {
            key: 'new-folder',
            label: 'New folder...',
            icon: <FolderPlus size={16} />,
            divider: folders.length > 0,
            onClick: () => {
              onCreateFolder();
            },
          },
        ]
      : []),
  ];

  // Build mute submenu items
  const muteSubmenuItems: DropdownMenuItem[] = [
    {
      key: 'select-tone',
      label: 'Select tone',
      icon: <SlidersHorizontal size={16} />,
      onClick: () => setActiveModal('selectTone'),
    },
    {
      key: 'disable-sound',
      label: 'Disable sound',
      icon: <VolumeX size={16} />,
      onClick: () =>
        muteConversation.mutate({
          conversationId: conversation.id,
          muteLevel: 'MESSAGES',
        }),
    },
    {
      key: 'mute-for',
      label: 'Mute for...',
      icon: <Clock size={16} />,
      onClick: () => setActiveModal('muteOptions'),
    },
    {
      key: 'mute-forever',
      label: isMuted ? 'Unmute this chat' : 'Mute forever',
      icon: isMuted ? <Bell size={16} /> : <BellOff size={16} />,
      danger: !isMuted,
      divider: true,
      onClick: () =>
        muteConversation.mutate({
          conversationId: conversation.id,
          muteLevel: isMuted ? 'NONE' : 'MESSAGES_AND_CALLS',
        }),
    },
  ];

  const items: DropdownMenuItem[] = [
    {
      key: 'open-standalone',
      label: 'Open in new window',
      icon: <AppWindow size={18} />,
      onClick: handleOpenInNewWindow,
    },
    {
      key: 'archive',
      label: conversation.isArchived ? 'Unarchive' : 'Archive',
      icon: conversation.isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />,
      onClick: () =>
        archiveConversation.mutate({
          conversationId: conversation.id,
          archived: !conversation.isArchived,
        }),
    },
    {
      key: 'pin',
      label: isPinnedLocally ? 'Unpin' : 'Pin',
      icon: isPinnedLocally ? <PinOff size={18} /> : <Pin size={18} />,
      onClick: () => onTogglePinLocally(conversation.id),
    },
    {
      key: 'mute-menu',
      label: 'Mute notifications',
      icon: isMuted ? <BellOff size={18} className="text-sky-400" /> : <BellOff size={18} />,
      hasSubmenu: true,
      submenuItems: muteSubmenuItems,
    },
    {
      key: 'read',
      label: hasUnread ? 'Mark as read' : 'Mark as unread',
      icon: hasUnread ? <MailOpen size={18} /> : <Mail size={18} />,
      onClick: () => {
        if (hasUnread) {
          markRead.mutate(conversation.id);
          onMarkReadLocally?.(conversation.id);
        } else {
          onToggleUnreadLocally(conversation.id);
        }
      },
    },
    ...(folderSubmenuItems.length > 0
      ? [
          {
            key: 'folders-menu',
            label: 'Add to folder',
            icon: <FolderPlus size={18} />,
            hasSubmenu: true,
            submenuItems: folderSubmenuItems,
          } satisfies DropdownMenuItem,
        ]
      : []),
    ...(otherUsername
      ? [
          {
            key: 'profile',
            label: 'View user profile',
            icon: <UserRound size={18} />,
            onClick: () => {
              navigate(`/${otherUsername}`);
            },
          } satisfies DropdownMenuItem,
        ]
      : []),
    {
      key: 'clear-history',
      label: 'Clear history',
      icon: <Eraser size={18} />,
      divider: true,
      onClick: () => setActiveModal('clearHistory'),
    },
    {
      key: 'delete-chat',
      label: 'Delete chat',
      icon: <Trash2 size={18} />,
      danger: true,
      onClick: () => setActiveModal('deleteChat'),
    },
  ];

  return (
    <>
      <DropdownMenu items={items} onClose={onClose} align="right" />

      {activeModal === 'muteOptions' && (
        <MuteOptionsModal
          onClose={() => {
            setActiveModal(null);
            onClose();
          }}
          onConfirm={(muteLevel, mutedUntil) => {
            muteConversation.mutate({
              conversationId: conversation.id,
              muteLevel,
              mutedUntil,
            });
            setActiveModal(null);
            onClose();
          }}
        />
      )}

      {activeModal === 'selectTone' && (
        <SelectToneModal
          conversationId={conversation.id}
          onClose={() => {
            setActiveModal(null);
            onClose();
          }}
        />
      )}

      {activeModal === 'clearHistory' && (
        <DeleteChatHistoryModal
          conversationName={conversationTitle}
          onClose={() => {
            setActiveModal(null);
            onClose();
          }}
          onConfirm={() => {
            clearChatHistory.mutate({ conversationId: conversation.id, forAll: false });
            setActiveModal(null);
            onClose();
          }}
          isLoading={clearChatHistory.isPending}
        />
      )}

      {activeModal === 'deleteChat' && (
        <DeleteChatModal
          conversationName={conversationTitle}
          avatarUrl={avatarUrl}
          isGroup={isGroup}
          memberAvatars={memberAvatars}
          otherUserName={otherUsername ?? conversationTitle}
          onClose={() => {
            setActiveModal(null);
            onClose();
          }}
          onConfirm={(forAll) => {
            deleteConversation.mutate({ conversationId: conversation.id, forAll });
            setActiveModal(null);
            onClose();
          }}
          isLoading={deleteConversation.isPending}
        />
      )}
    </>
  );
}
