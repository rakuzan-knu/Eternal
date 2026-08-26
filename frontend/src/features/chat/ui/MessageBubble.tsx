import React, { useState, useRef } from 'react';
import { Smile, Reply, MoreHorizontal, Check, CheckCheck, Clock, Pencil } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { MessageView } from '../../../entities/chat/model/types';
import { formatMessageTime } from '../lib/groupMessagesByDate';
import MessageReactionPicker from './MessageReactionPicker';
import ReactionBadge from './ReactionBadge';
import { triggerFlyingReaction } from '../lib/reactionBurstEngine';
import MessageContextMenu from './MessageContextMenu';
import DeleteMessageModal from './DeleteMessageModal';
import MessageAttachments from './MessageAttachments';
import ChatPollCard from './ChatPollCard';
import { parseChatPoll } from '../lib/chatPoll';
import { PostEmbedCard } from './PostEmbedCard';
import { LinkPreviewCard } from '../../../shared/ui/LinkPreviewCard';
import MarkdownContent from '../../../shared/ui/MarkdownContent';
import { extractFirstUrl } from '../../../shared/lib/urlUtils';
import { ClusterPosition } from './MessageList';
import { VideoNoteBubble } from './VideoNoteBubble';
import { StoryReplyEmbed } from './StoryReplyEmbed';
import { ChatThemeConfig } from '../model/chatTheme';
import { getBubbleContrastTheme, getBubbleStyle } from '../lib/themeUtils';

interface MessageBubbleProps {
  message: MessageView;
  isOwnMessage: boolean;
  showAvatar: boolean;
  isReadByOther: boolean;
  clusterPosition?: ClusterPosition;
  currentUserId: string | null;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  chatTheme?: ChatThemeConfig;
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
  chatTheme,
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
  const reactionsContainerRef = useRef<HTMLDivElement | null>(null);
  const bubbleContainerRef = useRef<HTMLDivElement | null>(null);

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

  const isLeaveMessage =
    (message as unknown as { messageType?: string }).messageType === 'SYSTEM' &&
    Boolean(
      message.body?.includes('left the group') || message.body?.includes('left the conversation'),
    );

  if (isLeaveMessage) {
    return (
      <div className="flex justify-center my-2.5 px-4 select-none">
        <span className="text-center text-xs text-gray-400 font-normal leading-relaxed">
          {message.body}
        </span>
      </div>
    );
  }

  const isSystem =
    (message as unknown as { messageType?: string }).messageType === 'SYSTEM' ||
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
              Edit group
            </button>
          </span>
          <span className="text-[10px] text-gray-500 ml-1.5 shrink-0">{timeString}</span>
        </div>
      </div>
    );
  }

  const handleReactionPick = (emoji: string, origin?: { x: number; y: number }) => {
    const existing = message.reactions.find((r) => r.emoji === emoji);
    if (existing?.selfReacted) {
      onUnreact(message.id, emoji);
      return;
    }

    if (origin) {
      const targetEl = reactionsContainerRef.current || bubbleContainerRef.current;
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const targetPoint = {
          x: rect.left + Math.min(rect.width / 2, 45),
          y: rect.top + rect.height / 2,
        };
        triggerFlyingReaction(origin, targetPoint, emoji, () => {
          onReact(message.id, emoji);
        });
        return;
      }
    }

    onReact(message.id, emoji);
  };

  const contrast = chatTheme ? getBubbleContrastTheme(chatTheme, isOwnMessage) : null;
  const bubbleStyles = chatTheme
    ? getBubbleStyle(chatTheme, isOwnMessage)
    : {
        style: {},
        className: isOwnMessage
          ? 'bg-gradient-to-br from-purple-600/30 to-purple-800/20 backdrop-blur-xl border border-purple-500/30 text-white shadow-[0_4px_20px_rgba(147,51,234,0.15)]'
          : 'bg-[#12131b]/80 backdrop-blur-xl border border-white/[0.08] text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
      };

  const isSending = Boolean((message as unknown as { isPending?: boolean }).isPending);
  const statusLabel = isSending ? 'Sending...' : isReadByOther ? 'Read' : 'Delivered';

  const statusIcon = isSending ? (
    <Clock size={11} className="animate-spin opacity-70" style={{ color: contrast?.statusColor }} />
  ) : isReadByOther ? (
    <CheckCheck
      size={13}
      className="stroke-[2.2]"
      style={{ color: contrast?.statusColor || '#c084fc' }}
    />
  ) : (
    <Check
      size={13}
      className="stroke-[2]"
      style={{ color: contrast?.timeColor || 'rgba(156, 163, 175, 1)' }}
    />
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

  const isSingleVideoNote =
    !pollData &&
    !isSoloEmoji &&
    !message.body &&
    message.attachments?.length === 1 &&
    message.attachments[0].type === 'VIDEO' &&
    (message.attachments[0].fileName?.includes('video_note') ||
      message.attachments[0].mimeType?.includes('video_note') ||
      (message.attachments[0].width &&
        message.attachments[0].height &&
        message.attachments[0].width === message.attachments[0].height));

  const showHoverBar = (isHovered || isPickerOpen || isMenuOpen) && !isSelectionMode;

  // Reply message snippet & thumbnail extraction
  const replySenderName = message.replyTo
    ? (message.replyTo.sender.displayName ?? message.replyTo.sender.username ?? 'User')
    : '';

  const replyAttachment = message.replyTo?.attachments?.[0];
  const replyThumbnail = replyAttachment?.thumbnailUrl || replyAttachment?.url;
  const isReplyMedia = Boolean(
    replyThumbnail &&
    (replyAttachment?.type === 'IMAGE' ||
      replyAttachment?.type === 'VIDEO' ||
      replyAttachment?.type === 'STICKER' ||
      replyAttachment?.type === 'GIF' ||
      replyAttachment?.mimeType?.startsWith('image/') ||
      replyAttachment?.mimeType?.startsWith('video/')),
  );

  const getReplySnippet = () => {
    if (!message.replyTo) return '';
    if (message.replyTo.body) return message.replyTo.body;
    if (!replyAttachment) return 'Message';
    if (replyAttachment.type === 'STICKER') return '⭐ Sticker';
    if (replyAttachment.type === 'IMAGE') return '🖼️ Photo';
    if (replyAttachment.type === 'VIDEO') return '📹 Video';
    if (replyAttachment.type === 'VOICE' || replyAttachment.type === 'AUDIO')
      return '🎙️ Voice message';
    if (replyAttachment.type === 'VIDEO_NOTE') return '⭕ Video message';
    if (replyAttachment.type === 'FILE') return `📄 ${replyAttachment.fileName || 'Document'}`;
    return 'Attachment';
  };

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

        {/* Bubble Body with Multi-Selection Click Handling */}
        <div
          className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%] select-text transition-all ${
            isSelectionMode ? 'cursor-pointer' : ''
          }`}
          style={{ alignItems: isOwnMessage ? 'flex-end' : 'flex-start' }}
          onClick={(e) => {
            if (isSelectionMode) {
              e.stopPropagation();
              onToggleSelect?.(message.id, e.shiftKey);
            }
          }}
        >
          {/* Floating Hover Action Bar (Instagram style: left of bubble for own messages, right of bubble for others, centered vertically) */}
          {showHoverBar && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 ${
                isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'
              } z-30 flex items-center gap-0.5 bg-[#14151f]/95 backdrop-blur-xl border border-white/[0.14] rounded-full px-1.5 py-0.5 shadow-2xl animate-popIn whitespace-nowrap`}
            >
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
                    onClose={() => setMenuOpen(false)}
                    onEdit={() => {
                      setMenuOpen(false);
                      onEdit(message);
                    }}
                    onDelete={() => {
                      setMenuOpen(false);
                      setDeleteModalOpen(true);
                    }}
                    onForward={() => {
                      setMenuOpen(false);
                      onForward(message);
                    }}
                    onTogglePin={() => {
                      setMenuOpen(false);
                      onTogglePin(message);
                    }}
                    onReport={() => {
                      setMenuOpen(false);
                      onReport(message);
                    }}
                    onSelectMessage={() => {
                      setMenuOpen(false);
                      onToggleSelect?.(message.id, false);
                    }}
                    align={isOwnMessage ? 'right' : 'left'}
                  />
                )}
              </div>
              {isPickerOpen && (
                <MessageReactionPicker
                  align={isOwnMessage ? 'right' : 'left'}
                  onPick={(emoji, origin) => handleReactionPick(emoji, origin)}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
          )}

          {message.forwardedFrom && (
            <p className="text-[11px] text-gray-400 mb-0.5 px-1 font-medium">
              Forwarded from{' '}
              {message.forwardedFrom.sender.displayName ?? message.forwardedFrom.sender.username}
            </p>
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
          ) : isSingleVideoNote ? (
            /* Circular Telegram-style Video Note without outer box */
            <div className="relative select-none">
              <VideoNoteBubble
                attachment={message.attachments[0]}
                senderName={
                  isOwnMessage ? 'You' : message.sender.displayName || message.sender.username
                }
                sentAt={formatMessageTime(message.createdAt)}
                conversationId={message.conversationId}
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white select-none pointer-events-none shadow-md z-10">
                <span className="text-[10px] font-medium tracking-tight">
                  {formatMessageTime(message.createdAt)}
                </span>
                {isOwnMessage && statusIcon}
              </div>
            </div>
          ) : (
            /* Liquid Glass Bubble with Custom Chat Theme */
            <div
              ref={bubbleContainerRef}
              style={{
                ...bubbleStyles.style,
                color: contrast ? contrast.textColor : undefined,
              }}
              className={`relative px-3.5 py-2 transition-all ${
                message.replyTo ? 'min-w-[210px] sm:min-w-[240px]' : 'min-w-[75px] sm:min-w-[85px]'
              } ${roundingClass} ${bubbleStyles.className}`}
            >
              {/* Interactive Quoted Message */}
              {message.replyTo && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onJumpToMessage?.(message.replyTo!.id);
                  }}
                  style={{
                    backgroundColor: contrast ? contrast.quoteBg : undefined,
                    borderLeftColor: contrast ? contrast.quoteBorder : undefined,
                  }}
                  className={`group/reply relative flex items-center mb-1.5 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-all duration-150 select-none overflow-hidden min-w-[190px] sm:min-w-[220px] max-w-full ${
                    !contrast
                      ? isOwnMessage
                        ? 'bg-black/20 hover:bg-black/35 border border-purple-400/25'
                        : 'bg-black/25 hover:bg-black/40 border border-white/[0.08]'
                      : 'border-l-2'
                  }`}
                  title="Jump to original message"
                >
                  {/* Left colored vertical bar */}
                  {!contrast && (
                    <div
                      className={`w-[3px] self-stretch rounded-full mr-2.5 flex-shrink-0 ${
                        isOwnMessage ? 'bg-purple-300' : 'bg-sky-400'
                      }`}
                    />
                  )}

                  {/* Media Thumbnail (if image, video or sticker) */}
                  {isReplyMedia && (
                    <img
                      src={replyThumbnail}
                      alt="Attachment preview"
                      className="w-9 h-9 rounded-md object-cover flex-shrink-0 mr-2.5 bg-black/40 border border-white/10"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}

                  {/* Text Details (Author name + snippet) */}
                  <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
                    <p
                      style={{ color: contrast ? contrast.quoteAuthorColor : undefined }}
                      className={`text-[12.5px] font-semibold leading-tight truncate ${
                        !contrast ? (isOwnMessage ? 'text-purple-300' : 'text-sky-400') : ''
                      }`}
                    >
                      {replySenderName}
                    </p>
                    <p
                      style={{ color: contrast ? contrast.quoteSnippetColor : undefined }}
                      className={`text-[11.5px] leading-tight truncate mt-0.5 whitespace-nowrap ${
                        !contrast ? 'text-white/80' : ''
                      }`}
                    >
                      {getReplySnippet()}
                    </p>
                  </div>
                </div>
              )}

              {/* Story Reply Rich Frame Header */}
              {((message as any).type === 'STORY_REPLY' ||
                (message as any).messageType === 'STORY_REPLY') && (
                <StoryReplyEmbed
                  attachment={message.attachments?.[0]}
                  createdAt={message.createdAt}
                  isOwnMessage={isOwnMessage}
                />
              )}

              {message.attachments &&
                message.attachments.length > 0 &&
                (message as any).type !== 'STORY_REPLY' &&
                (message as any).messageType !== 'STORY_REPLY' && (
                  <div className="relative mb-0.5">
                    <MessageAttachments
                      attachments={message.attachments}
                      isOwnMessage={isOwnMessage}
                      senderName={
                        isOwnMessage ? 'You' : message.sender.displayName || message.sender.username
                      }
                      sentAt={formatMessageTime(message.createdAt)}
                      conversationId={message.conversationId}
                      statusIcon={isOwnMessage ? statusIcon : null}
                    />
                    {!message.body &&
                      !message.attachments.every((a) => a.type === 'AUDIO') &&
                      !message.attachments.every((a) => a.type === 'FILE') && (
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
                    {!message.body &&
                      !message.attachments.every((a) => a.type === 'AUDIO') &&
                      message.attachments.every((a) => a.type === 'FILE') && (
                        <div className="flex items-center justify-end gap-1 mt-1 px-1 select-none text-gray-400">
                          <span className="text-[10px] font-normal tracking-tight">
                            {formatMessageTime(message.createdAt)}
                          </span>
                          {isOwnMessage && statusIcon}
                        </div>
                      )}
                  </div>
                )}

              {message.body && (
                <div className="relative text-[14.5px] leading-[1.38] break-words [overflow-wrap:anywhere]">
                  {displayText && (
                    <div
                      className="font-normal"
                      style={{ color: contrast ? contrast.textColor : undefined }}
                    >
                      <MarkdownContent content={displayText} />
                    </div>
                  )}

                  {embeddedPostId && (
                    <PostEmbedCard postId={embeddedPostId} isOwnMessage={isOwnMessage} />
                  )}

                  {firstExternalUrl && <LinkPreviewCard url={firstExternalUrl} />}

                  <span
                    className="float-right inline-flex items-center gap-1 ml-2.5 mt-0.5 select-none whitespace-nowrap text-[11px] leading-none"
                    style={{ color: contrast ? contrast.timeColor : undefined }}
                  >
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

          {message.reactions.length > 0 && (
            <div
              ref={reactionsContainerRef}
              className="flex flex-wrap gap-1.5 mt-1 px-1 select-none"
            >
              {message.reactions.map((r) => (
                <ReactionBadge
                  key={r.emoji}
                  reaction={r}
                  currentUserId={currentUserId}
                  onToggle={(emoji, selfReacted) => {
                    if (selfReacted) {
                      onUnreact(message.id, emoji);
                    } else {
                      onReact(message.id, emoji);
                    }
                  }}
                />
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
    </div>
  );
}
