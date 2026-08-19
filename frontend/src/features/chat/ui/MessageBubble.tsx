import React, { useState, useRef } from 'react';
import { Smile, Reply, MoreHorizontal, Check, CheckCheck, Clock, Pencil } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { MessageView } from '../../../entities/chat/model/types';
import { formatMessageTime } from '../lib/groupMessagesByDate';
import MessageReactionPicker from './MessageReactionPicker';
import MessageReactionsModal from './MessageReactionsModal';
import MessageContextMenu from './MessageContextMenu';
import DeleteMessageModal from './DeleteMessageModal';
import MessageAttachments from './MessageAttachments';
import ChatPollCard, { parseChatPoll } from './ChatPollCard';
import { PostEmbedCard } from './PostEmbedCard';
import { LinkPreviewCard } from '../../../shared/ui/LinkPreviewCard';
import TextWithSpoilers from '../../../shared/ui/TextWithSpoilers';
import { extractFirstUrl } from '../../../shared/lib/urlUtils';
import { ClusterPosition } from './MessageList';

interface MessageBubbleProps {
  message: MessageView;
  isOwnMessage: boolean;
  showAvatar: boolean;
  isReadByOther: boolean;
  clusterPosition?: ClusterPosition;
  currentUserId: string | null;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (messageId: string, isShift: boolean) => void;
  onReply: (message: MessageView) => void;
  onEdit: (message: MessageView) => void;
  onDelete: (messageId: string, forAll: boolean) => void;
  onForward: (message: MessageView) => void;
  onTogglePin: (message: MessageView) => void;
  onReport: (message: MessageView) => void;
  onReact: (messageId: string, emoji: string) => void;
  onUnreact: (messageId: string, emoji: string) => void;
  onJumpToMessage?: (messageId: string) => void;
}

function getBubbleRounding(isOwnMessage: boolean, position: ClusterPosition = 'single'): string {
  if (isOwnMessage) {
    switch (position) {
      case 'first':
        return 'rounded-[20px] rounded-br-md';
      case 'middle':
        return 'rounded-l-[20px] rounded-r-md';
      case 'last':
        return 'rounded-l-[20px] rounded-tr-md rounded-br-[4px]';
      case 'single':
      default:
        return 'rounded-[20px] rounded-br-[4px]';
    }
  } else {
    switch (position) {
      case 'first':
        return 'rounded-[20px] rounded-bl-md';
      case 'middle':
        return 'rounded-r-[20px] rounded-l-md';
      case 'last':
        return 'rounded-r-[20px] rounded-tl-md rounded-bl-[4px]';
      case 'single':
      default:
        return 'rounded-[20px] rounded-bl-[4px]';
    }
  }
}

function extractPostInfo(body: string): { displayText: string; postId: string | null } {
  if (!body) return { displayText: '', postId: null };

  const postMatch = body.match(/(?:https?:\/\/[^\s]+)?(?:#post-|\/post\/)([a-zA-Z0-9_-]+)/i);
  if (postMatch) {
    const postId = postMatch[1];
    const urlRegex = /(?:https?:\/\/[^\s]+)?(?:#post-|\/post\/)[a-zA-Z0-9_-]+/gi;
    const cleanText = body.replace(urlRegex, '').trim();
    return { displayText: cleanText, postId };
  }

  return { displayText: body, postId: null };
}

export default function MessageBubble({
  message,
  isOwnMessage,
  showAvatar,
  isReadByOther,
  clusterPosition = 'single',
  currentUserId,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onTogglePin,
  onReport,
  onReact,
  onUnreact,
  onJumpToMessage,
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isReactionsModalOpen, setReactionsModalOpen] = useState(false);

  const { displayText, postId: embeddedPostId } = extractPostInfo(message.body || '');
  const firstExternalUrl = !embeddedPostId ? extractFirstUrl(message.body) : null;

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSelectionMode) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isSelectionMode) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

    // 15-degree gesture lock threshold: deltaX > deltaY * 2
    if (deltaX > 8 && deltaX > deltaY * 2) {
      const clamped = Math.min(deltaX * 0.55, 65);
      setSwipeOffset(clamped);
    } else if (deltaY > deltaX) {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (isSelectionMode) return;
    if (swipeOffset >= 42) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
      onReply(message);
    }
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} px-4 py-0.5`}>
        <p className="text-xs italic text-gray-500 bg-white/5 border border-white/5 px-3 py-1 rounded-xl">
          This message was deleted
        </p>
      </div>
    );
  }

  const isSystem =
    (message as unknown as { messageType?: string }).messageType === 'SYSTEM' ||
    message.body?.startsWith('Пользователь ') ||
    message.body?.startsWith('User ');

  if (isSystem) {
    const timeString = formatMessageTime(message.createdAt);
    return (
      <div className="flex justify-center my-2.5 px-4 select-none">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181926]/90 border border-white/10 backdrop-blur-xl text-xs text-gray-300 shadow-md">
          <Pencil size={12} className="text-purple-400 shrink-0" />
          <span className="leading-relaxed">
            {message.body}{' '}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('open-edit-group', {
                    detail: { conversationId: message.conversationId },
                  }),
                );
              }}
              className="text-sky-400 hover:text-sky-300 font-medium hover:underline ml-1 cursor-pointer transition-colors"
            >
              Редактировать группу
            </button>
          </span>
          <span className="text-[10px] text-gray-500 ml-1.5 shrink-0">{timeString}</span>
        </div>
      </div>
    );
  }

  const handleReactionClick = (emoji: string) => {
    const existing = message.reactions.find((r) => r.emoji === emoji);
    if (existing?.selfReacted) onUnreact(message.id, emoji);
    else onReact(message.id, emoji);
  };

  const isSending = Boolean((message as unknown as { isPending?: boolean }).isPending);
  const statusLabel = isSending ? 'Sending...' : isReadByOther ? 'Read' : 'Delivered';

  const statusIcon = isSending ? (
    <Clock size={11} className="text-gray-400 animate-spin" />
  ) : isReadByOther ? (
    <CheckCheck size={13} className="text-purple-400 stroke-[2.2]" />
  ) : (
    <Check size={13} className="text-gray-400 stroke-[2]" />
  );

  const roundingClass = getBubbleRounding(isOwnMessage, clusterPosition);
  const isClusterEnd = clusterPosition === 'last' || clusterPosition === 'single';
  const verticalSpacingClass = isClusterEnd ? 'mb-1.5' : 'mb-0.5';

  // Solo Emoji Detection
  const isSoloEmoji =
    Boolean(message.body) &&
    /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s){1,3}$/u.test(message.body!.trim()) &&
    (!message.attachments || message.attachments.length === 0) &&
    !message.replyTo &&
    !message.forwardedFrom &&
    !embeddedPostId &&
    !firstExternalUrl;

  const pollData = parseChatPoll(message.body);

  const showHoverBar = (isHovered || isPickerOpen || isMenuOpen) && !isSelectionMode;

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex items-center gap-2 px-3 sm:px-4 py-0 ${verticalSpacingClass} ${
        isOwnMessage ? 'justify-end' : 'justify-start'
      } ${showHoverBar ? 'z-20' : 'z-0'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={(e) => {
        if (isSelectionMode) return;
        e.preventDefault();
        onReply(message);
      }}
    >
      {/* Selection Mode Checkbox */}
      {isSelectionMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(message.id, e.shiftKey);
          }}
          className="flex-shrink-0 cursor-pointer self-center mr-1 focus:outline-none"
        >
          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-purple-500 border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                : 'border-white/30 hover:border-white/60 bg-white/5'
            }`}
          >
            {isSelected && <Check size={12} className="stroke-[2.5]" />}
          </div>
        </button>
      )}

      {/* Swipe to reply indicator */}
      {swipeOffset > 0 && (
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 pointer-events-none transition-transform duration-75"
          style={{
            transform: `translateY(-50%) scale(${Math.min(swipeOffset / 42, 1.15)})`,
            opacity: Math.min(swipeOffset / 25, 1),
          }}
        >
          <Reply size={15} />
        </div>
      )}

      <div
        className={`flex items-end gap-2 max-w-full relative ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
          isSwiping ? '' : 'transition-transform duration-200 ease-out'
        }`}
        style={{
          transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
        }}
      >
        {!isOwnMessage && (
          <div className="w-8 flex-shrink-0 self-end flex items-end justify-center mb-0.5">
            {showAvatar ? (
              <Avatar size="sm" src={message.sender.avatar} />
            ) : (
              <div className="w-8 h-8 pointer-events-none" />
            )}
          </div>
        )}

        <div
          className="max-w-[84%] sm:max-w-[74%] flex flex-col"
          style={{ alignItems: isOwnMessage ? 'flex-end' : 'flex-start' }}
          onClick={(e) => {
            if (isSelectionMode) {
              e.stopPropagation();
              onToggleSelect?.(message.id, e.shiftKey);
            }
          }}
        >
          {message.forwardedFrom && (
            <p className="text-[11px] text-gray-400 mb-0.5 px-1 font-medium">
              Forwarded from{' '}
              {message.forwardedFrom.sender.displayName ?? message.forwardedFrom.sender.username}
            </p>
          )}

          <div className="relative max-w-full">
            {/* Absolute Floating Hover Action Bar (Instagram style: left of own messages, right of others, vertically centered) */}
            {showHoverBar && (
              <div
                className={`absolute top-1/2 -translate-y-1/2 ${
                  isOwnMessage ? 'right-[calc(100%+8px)]' : 'left-[calc(100%+8px)]'
                } z-30 flex items-center gap-0.5 bg-[#14151f]/95 backdrop-blur-xl border border-white/[0.14] rounded-full px-1.5 py-0.5 shadow-2xl animate-popIn whitespace-nowrap select-none`}
              >
                {isOwnMessage ? (
                  <>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="More actions"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {isMenuOpen && (
                        <MessageContextMenu
                          message={message}
                          isOwnMessage={isOwnMessage}
                          align="right"
                          onClose={() => setMenuOpen(false)}
                          onEdit={() => onEdit(message)}
                          onDelete={() => setDeleteModalOpen(true)}
                          onForward={() => onForward(message)}
                          onTogglePin={() => onTogglePin(message)}
                          onReport={() => onReport(message)}
                          onSelectMessage={() => onToggleSelect?.(message.id, false)}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onReply(message)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Reply"
                    >
                      <Reply size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerOpen((v) => !v)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="React"
                    >
                      <Smile size={14} />
                    </button>
                    {isPickerOpen && (
                      <MessageReactionPicker
                        align="right"
                        onPick={(emoji) => handleReactionClick(emoji)}
                        onClose={() => setPickerOpen(false)}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPickerOpen((v) => !v)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="React"
                    >
                      <Smile size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReply(message)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Reply"
                    >
                      <Reply size={14} />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="More actions"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {isMenuOpen && (
                        <MessageContextMenu
                          message={message}
                          isOwnMessage={isOwnMessage}
                          align="left"
                          onClose={() => setMenuOpen(false)}
                          onEdit={() => onEdit(message)}
                          onDelete={() => setDeleteModalOpen(true)}
                          onForward={() => onForward(message)}
                          onTogglePin={() => onTogglePin(message)}
                          onReport={() => onReport(message)}
                          onSelectMessage={() => onToggleSelect?.(message.id, false)}
                        />
                      )}
                    </div>
                    {isPickerOpen && (
                      <MessageReactionPicker
                        align="left"
                        onPick={(emoji) => handleReactionClick(emoji)}
                        onClose={() => setPickerOpen(false)}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {pollData ? (
              <div className="flex flex-col">
                <ChatPollCard messageId={message.id} poll={pollData} isOwnMessage={isOwnMessage} />
                <span className="inline-flex items-center gap-1 self-end mt-1 px-2 py-0.5 rounded-full bg-black/40 text-[10px] text-gray-400 select-none">
                  {formatMessageTime(message.createdAt)}
                  {isOwnMessage && statusIcon}
                </span>
              </div>
            ) : isSoloEmoji ? (
              /* Solo Emoji Large Transparent Display */
              <div className="relative p-1 select-text">
                <span className="text-4xl sm:text-5xl leading-tight inline-block filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] select-text">
                  {message.body!.trim()}
                </span>
                <span className="inline-flex items-center gap-1 ml-2 align-bottom px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] text-white/70 select-none">
                  {formatMessageTime(message.createdAt)}
                  {isOwnMessage && statusIcon}
                </span>
              </div>
            ) : (
              /* Dark Liquid Glass Bubble */
              <div
                className={`relative px-3.5 py-2 transition-all ${roundingClass} ${
                  isOwnMessage
                    ? 'bg-gradient-to-br from-purple-600/30 to-purple-800/20 backdrop-blur-xl border border-purple-500/30 text-white shadow-[0_4px_20px_rgba(147,51,234,0.15)]'
                    : 'bg-[#12131b]/80 backdrop-blur-xl border border-white/[0.08] text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                }`}
              >
                {/* Interactive Quoted Message */}
                {message.replyTo && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToMessage?.(message.replyTo!.id);
                    }}
                    className={`mb-1.5 px-2.5 py-1 rounded-lg max-w-full text-left cursor-pointer transition-opacity hover:opacity-85 active:scale-[0.99] ${
                      isOwnMessage
                        ? 'border-l-[3px] border-purple-400 bg-purple-500/10 text-gray-200'
                        : 'border-l-[3px] border-sky-400 bg-sky-500/10 text-gray-200'
                    }`}
                    title="Jump to original message"
                  >
                    <p
                      className={`text-[11px] font-bold ${
                        isOwnMessage ? 'text-purple-300' : 'text-sky-400'
                      }`}
                    >
                      {message.replyTo.sender.displayName ?? message.replyTo.sender.username}
                    </p>
                    <p className="text-[11px] truncate text-gray-300">
                      {message.replyTo.body || 'Attachment'}
                    </p>
                  </div>
                )}

                {message.attachments && message.attachments.length > 0 && (
                  <div className="relative mb-1">
                    <MessageAttachments
                      attachments={message.attachments}
                      isOwnMessage={isOwnMessage}
                      senderName={
                        isOwnMessage ? 'You' : message.sender.displayName || message.sender.username
                      }
                      sentAt={formatMessageTime(message.createdAt)}
                      conversationId={message.conversationId}
                    />
                    {!message.body && (
                      <div
                        className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white select-none"
                        title={statusLabel}
                      >
                        <span className="text-[10px] font-normal tracking-tight">
                          {formatMessageTime(message.createdAt)}
                        </span>
                        {isOwnMessage && statusIcon}
                      </div>
                    )}
                  </div>
                )}

                {message.body && (
                  <div className="relative text-[14.5px] leading-[1.38] break-words">
                    {displayText && (
                      <span className="font-normal text-white">
                        <TextWithSpoilers text={displayText} />
                      </span>
                    )}

                    {embeddedPostId && (
                      <PostEmbedCard postId={embeddedPostId} isOwnMessage={isOwnMessage} />
                    )}

                    {firstExternalUrl && <LinkPreviewCard url={firstExternalUrl} />}

                    <span className="inline-flex items-center gap-1 align-baseline float-right ml-2 mt-1 select-none whitespace-nowrap text-gray-400">
                      {message.isEdited && (
                        <span className="text-[10px] opacity-75 font-normal">edited</span>
                      )}
                      <span className="text-[11px] font-normal tracking-tight">
                        {formatMessageTime(message.createdAt)}
                      </span>

                      {isOwnMessage && (
                        <span
                          className="relative group/status inline-flex items-center cursor-default"
                          title={statusLabel}
                        >
                          {statusIcon}
                          <span className="absolute bottom-full mb-1.5 right-1/2 translate-x-1/2 hidden group-hover/status:flex items-center px-2 py-0.5 rounded-md bg-black/90 text-white text-[10px] font-medium whitespace-nowrap shadow-lg border border-white/10 z-30 pointer-events-none animate-fadeIn">
                            {statusLabel}
                          </span>
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 px-1">
              {message.reactions.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => setReactionsModalOpen(true)}
                  className={`animate-popIn active:scale-125 transition-transform duration-150 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${
                    r.selfReacted
                      ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="font-semibold text-[11px]">{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isDeleteModalOpen && (
        <DeleteMessageModal
          isOwnMessage={isOwnMessage}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={(forAll) => {
            onDelete(message.id, forAll);
            setDeleteModalOpen(false);
          }}
        />
      )}

      {isReactionsModalOpen && (
        <MessageReactionsModal
          reactions={message.reactions}
          currentUserId={currentUserId}
          onClose={() => setReactionsModalOpen(false)}
          onRemoveOwn={(emoji) => onUnreact(message.id, emoji)}
        />
      )}
    </div>
  );
}
