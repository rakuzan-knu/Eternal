import React, { useState } from 'react';
import { MoreHorizontal, Pin, Users, BellOff } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { ConversationView } from '../../../entities/chat/model/types';
import {
  getConversationDisplay,
  getMessagePreview,
} from '../../../features/chat/lib/getConversationDisplay';
import ChatItemMenu from './ChatItemMenu';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import { useTypingStore } from '../model/useTypingStore';

interface ChatListItemProps {
  conversation: ConversationView;
  currentUserId: string | null;
  isActive: boolean;
  isPinnedLocally: boolean;
  isForcedUnread: boolean;
  onSelect: (conversationId: string) => void;
  onTogglePinLocally: (conversationId: string) => void;
  onToggleUnreadLocally: (conversationId: string) => void;
}

function formatChatListTime(iso: string | Date) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatListItem({
  conversation,
  currentUserId,
  isActive,
  isPinnedLocally,
  isForcedUnread,
  onSelect,
  onTogglePinLocally,
  onToggleUnreadLocally,
}: ChatListItemProps) {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isMuted = conversation.myMuteLevel !== 'NONE';
  const typists = useTypingStore((s) => s.typingByConversation[conversation.id] ?? []);
  const isTyping = typists.length > 0;

  const display = getConversationDisplay(conversation, currentUserId);
  const hasUnread = isForcedUnread || conversation.unreadCount > 0;
  const visibleUnreadCount = Math.max(conversation.unreadCount, isForcedUnread ? 1 : 0);
  const unreadLabel = visibleUnreadCount > 99 ? '99+' : String(visibleUnreadCount);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(conversation.id)}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors duration-150 ${
        isActive ? 'bg-white/10' : isHovered ? 'bg-white/5' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        {display.isGroup ? (
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-400">
            <Users size={18} />
          </div>
        ) : (
          <>
            <Avatar size="md" src={display.avatar} />
            {display.otherUserId && (
              <OnlineStatusIndicator userId={display.otherUserId} variant="dot" />
            )}
          </>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[15px] truncate ${hasUnread ? 'text-white font-semibold' : 'text-gray-200 font-medium'}`}
          >
            {display.title}
          </span>
          {isMuted && <BellOff size={12} className="text-gray-500 flex-shrink-0" />}
          {isPinnedLocally && <Pin size={12} className="text-gray-500 flex-shrink-0" />}
        </div>
        {isTyping ? (
          <div className="flex items-center gap-1.5 text-[13px] text-sky-400 font-medium animate-fadeIn">
            <span className="flex gap-0.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
            </span>
            <span className="truncate">
              {display.isGroup && typists[0].username
                ? `${typists[0].username} is typing...`
                : 'typing...'}
            </span>
          </div>
        ) : (
          <p className={`text-[13px] truncate ${hasUnread ? 'text-gray-200' : 'text-gray-500'}`}>
            {getMessagePreview(conversation)}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center w-12 justify-end">
        {!isHovered && !isMenuOpen && (
          <div className="flex flex-col items-end gap-1">
            {conversation.lastMessage && (
              <span className="text-[12px] leading-none text-gray-500 whitespace-nowrap">
                {formatChatListTime(conversation.lastMessage.createdAt)}
              </span>
            )}
            {hasUnread && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black text-[11px] font-bold leading-none flex items-center justify-center">
                {unreadLabel}
              </span>
            )}
          </div>
        )}

        {(isHovered || isMenuOpen) && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>
            {isMenuOpen && (
              <div onClick={(e) => e.stopPropagation()}>
                <ChatItemMenu
                  conversation={conversation}
                  otherUserId={display.otherUserId}
                  isPinnedLocally={isPinnedLocally}
                  isForcedUnread={isForcedUnread}
                  onClose={() => setMenuOpen(false)}
                  onTogglePinLocally={onTogglePinLocally}
                  onToggleUnreadLocally={onToggleUnreadLocally}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
