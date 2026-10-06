import { Nameplate } from '@/shared/ui/Nameplate';
import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pin, BellOff } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import GroupAvatarCollage from '../../../shared/ui/GroupAvatarCollage';
import { ConversationView } from '../../../entities/chat/model/types';
import {
  getConversationDisplay,
  getMessagePreview,
} from '../../../features/chat/lib/getConversationDisplay';
import ChatItemMenu from './ChatItemMenu';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import { useTypingStore } from '../model/useTypingStore';
import { useChatDraftsStore } from '../model/useChatDraftsStore';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import { TelegramAppleEmoji, parseEmojiSegments } from './Call/TelegramAppleEmoji';

function renderChatListSnippet(rawText: string, emojiSize = 16): React.ReactNode {
  if (!rawText) return null;
  if (!/\p{Extended_Pictographic}/u.test(rawText)) {
    return rawText;
  }
  const segments = parseEmojiSegments(rawText);
  return segments.map((seg, idx) => {
    if (seg.type === 'emoji') {
      return (
        <TelegramAppleEmoji
          key={idx}
          emoji={seg.content}
          size={emojiSize}
          playAnimation={false}
          className="inline-flex align-[-0.22em] mx-[1px] select-none"
        />
      );
    }
    return <React.Fragment key={idx}>{seg.content}</React.Fragment>;
  });
}

interface ChatListItemProps {
  conversation: ConversationView;
  currentUserId: string | null;
  isActive: boolean;
  isPinnedLocally: boolean;
  isForcedUnread: boolean;
  onSelect: (conversationId: string) => void;
  onTogglePinLocally: (conversationId: string) => void;
  onToggleUnreadLocally: (conversationId: string) => void;
  onMarkReadLocally?: (conversationId: string) => void;
  onCreateFolder?: () => void;
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
  onMarkReadLocally,
  onCreateFolder,
}: ChatListItemProps) {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isMuted = conversation.myMuteLevel !== 'NONE';
  const isTyping = useTypingStore(
    (s) => (s.typingByConversation[conversation.id]?.length ?? 0) > 0,
  );
  const firstTypistUsername = useTypingStore(
    (s) => s.typingByConversation[conversation.id]?.[0]?.username,
  );

  const draft = useChatDraftsStore((s) => s.drafts[conversation.id]);
  const hasDraft = Boolean(draft?.text?.trim());

  const display = getConversationDisplay(conversation, currentUserId);
  const hasUnread = isForcedUnread || conversation.unreadCount > 0;
  const visibleUnreadCount = Math.max(conversation.unreadCount, isForcedUnread ? 1 : 0);
  const unreadLabel = visibleUnreadCount > 99 ? '99+' : String(visibleUnreadCount);

  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive) {
      itemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  return (
    <div
      ref={itemRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(conversation.id)}
      className={`nameplate-row group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isActive
          ? 'glass-card bg-white/12 dark:bg-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.45),0_0_18px_rgba(56,189,248,0.15)] border border-white/20 dark:border-white/15 scale-[1.012]'
          : isHovered
            ? 'bg-white/5 border border-white/5'
            : 'border border-transparent'
      }`}
    >
      <Nameplate nameplate={display.activeNameplate} />
      {/* Specular Liquid Glass Top Reflection Sweep */}
      {isActive && (
        <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none rounded-t-full" />
      )}
      <div className="relative flex-shrink-0">
        {display.isGroup ? (
          display.avatar ? (
            <Avatar size="md" src={display.avatar} />
          ) : (
            <GroupAvatarCollage
              avatars={conversation.participants.map((p) => p.user.avatar)}
              size={40}
            />
          )
        ) : (
          <>
            <Avatar
              size="md"
              src={display.avatar}
              decoration={display.activeDecoration}
              userId={display.otherUserId}
            />
            {display.otherUserId && (
              <OnlineStatusIndicator userId={display.otherUserId} variant="dot" />
            )}
          </>
        )}
      </div>

      <div data-nameplate-text className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            data-nameplate-label
            className={`text-[15px] truncate ${
              hasUnread
                ? 'text-white font-semibold'
                : isMuted
                  ? 'text-gray-400 font-medium'
                  : 'text-gray-200 font-medium'
            }`}
          >
            {renderChatListSnippet(display.title, 18)}
          </span>
          <VerifiedCheckmark
            isVerified={display.isVerified}
            primaryBadge={display.primaryBadge}
            size="sm"
          />
          {isMuted && <BellOff size={13} className="text-gray-400 flex-shrink-0" />}
          {isPinnedLocally && <Pin size={12} className="text-gray-400 flex-shrink-0" />}
        </div>
        {hasDraft ? (
          <p className="text-[13px] truncate flex items-center gap-1">
            <span className="text-red-400 font-semibold drop-shadow-[0_0_8px_rgba(248,113,113,0.4)] flex-shrink-0">
              Draft:
            </span>
            <span className="text-gray-300 truncate">{renderChatListSnippet(draft!.text, 16)}</span>
          </p>
        ) : isTyping ? (
          <div className="flex items-center gap-1.5 text-[13px] text-sky-400 font-medium animate-fadeIn">
            <span className="flex gap-0.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
            </span>
            <span className="truncate">
              {display.isGroup && firstTypistUsername
                ? `${firstTypistUsername} is typing...`
                : 'typing...'}
            </span>
          </div>
        ) : (
          <p
            className={`text-[13px] truncate ${
              hasUnread ? 'text-gray-200' : isMuted ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            {renderChatListSnippet(getMessagePreview(conversation, currentUserId), 16)}
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
                  otherUsername={display.otherUsername}
                  conversationTitle={display.title}
                  avatarUrl={display.avatar}
                  isGroup={display.isGroup}
                  memberAvatars={conversation.participants.map((p) => p.user.avatar)}
                  isPinnedLocally={isPinnedLocally}
                  isForcedUnread={isForcedUnread}
                  onClose={() => setMenuOpen(false)}
                  onTogglePinLocally={onTogglePinLocally}
                  onToggleUnreadLocally={onToggleUnreadLocally}
                  onMarkReadLocally={onMarkReadLocally}
                  onCreateFolder={onCreateFolder}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
