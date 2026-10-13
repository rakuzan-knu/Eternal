import Avatar from '@/shared/ui/Avatar';
import TypingIndicatorBubble from './TypingIndicatorBubble';
import { ChevronDown } from 'lucide-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AttachmentView, MessageView, UserSnapshot } from '../../../entities/chat/model/types';
import { groupMessagesByDate } from '../lib/groupMessagesByDate';
import { ChatThemeConfig } from '../model/chatTheme';
import MessageBubble from './MessageBubble';
import { MessageThreadSkeleton, OlderMessagesSkeleton } from './MessageListSkeletons';
import { isVideoAttachment, isImageAttachment } from '../lib/chatMediaUtils';

import { useSpotifyDockOffset } from '@/shared/model/useSpotifyDockOffset';
import { CallHistoryItem } from './Call/CallHistoryItem';
import SystemMessageCluster from './SystemMessageCluster';
import { ThemeProposalMessage } from './ThemeProposalMessage';

export type ClusterPosition = 'single' | 'first' | 'middle' | 'last';

interface MessageListProps {
  messages: MessageView[];
  currentUserId: string | null;
  otherParticipantId: string | null;
  conversationId?: string;
  onThemeAccepted?: (themeString: string) => void;
  otherParticipant?: {
    userId: string;
    nickname?: string | null;
    user: UserSnapshot;
  };
  display?: {
    title: string;
    avatar?: string | null;
    isGroup: boolean;
  };
  hasMore: boolean;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasNewer?: boolean;
  isFetchingNewer?: boolean;
  typingParticipants: UserSnapshot[];
  isGroup: boolean;
  isSelectionMode?: boolean;
  selectedMessageIds?: Set<string>;
  chatTheme?: ChatThemeConfig;
  onToggleSelectMessage?: (messageId: string, isShift: boolean) => void;
  onLoadMore: () => void;
  onReply: (message: MessageView) => void;
  onEdit: (message: MessageView) => void;
  onDelete: (messageId: string, forAll: boolean) => void;
  onForward: (message: MessageView) => void;
  onTogglePin: (message: MessageView) => void;
  onReport: (message: MessageView) => void;
  onReact: (messageId: string, emoji: string) => void;
  onUnreact: (messageId: string, emoji: string) => void;
  onMarkRead?: (lastReadMessageId?: string) => void;
  highlightMessageId?: string | null;
  onHighlightHandled?: () => void;
  onJumpToMessage?: (messageId: string) => void;
  onLoadAround?: (messageId: string) => Promise<unknown>;
  onOpenDatePicker?: (initialDate?: Date, anchorRect?: DOMRect) => void;
  contentMaxWidth?: number;
  horizontalShift?: number;
  highlightDateLabel?: string | null;
  isAnchoredInHistory?: boolean;
  onResetToLive?: () => void;
  onLoadOlder?: () => void;
  onLoadNewer?: () => void;
  onRetry?: (messageId: string) => void;
  onOpenMedia?: (attachment: AttachmentView, originRect?: DOMRect, message?: MessageView) => void;
}

type Row =
  | { type: 'separator'; key: string; label: string; date?: Date }
  | {
      type: 'message';
      key: string;
      message: MessageView;
      showAvatar: boolean;
      clusterPosition: ClusterPosition;
    }
  | {
      type: 'system_cluster';
      key: string;
      messages: MessageView[];
    };

function isSameSenderAndMinute(msg1: MessageView, msg2: MessageView): boolean {
  if (!msg1.sender?.id || !msg2.sender?.id || msg1.sender.id !== msg2.sender.id) return false;

  // Circular video notes and voice notes must always stand alone with full breathing room, never clustered tightly!
  const isStandaloneMedia = (m: MessageView) =>
    m.attachments?.some(
      (a) =>
        a.type === 'AUDIO' ||
        (a.type === 'VIDEO' &&
          (a.fileName?.includes('video_note') ||
            a.mimeType?.includes('video_note') ||
            (a.width && a.height && a.width === a.height))),
    );
  if (isStandaloneMedia(msg1) || isStandaloneMedia(msg2)) return false;
  const d1 = new Date(msg1.createdAt);
  const d2 = new Date(msg2.createdAt);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate() &&
    d1.getHours() === d2.getHours() &&
    d1.getMinutes() === d2.getMinutes()
  );
}

function buildRows(messages: MessageView[]): Row[] {
  const groups = groupMessagesByDate(messages);
  const rows: Row[] = [];
  groups.forEach((group) => {
    rows.push({
      type: 'separator',
      key: `sep-${group.date?.toISOString() ?? group.label}`,
      label: group.label,
      date: group.date,
    });

    let currentSystemCluster: MessageView[] = [];

    const flushSystemCluster = () => {
      if (currentSystemCluster.length > 0) {
        rows.push({
          type: 'system_cluster',
          key: `sys-cluster-${currentSystemCluster[0].id}-${currentSystemCluster.length}`,
          messages: [...currentSystemCluster],
        });
        currentSystemCluster = [];
      }
    };

    group.messages.forEach((message, index) => {
      const isLeave =
        message.messageType === 'SYSTEM' &&
        Boolean(
          message.body?.includes('left the group') ||
          message.body?.includes('left the conversation'),
        );

      if (isLeave) {
        flushSystemCluster();
        rows.push({
          type: 'system_cluster',
          key: `sys-leave-${message.id}`,
          messages: [message],
        });
        return;
      }

      const isSystem =
        message.messageType === 'SYSTEM' || (message.messageType as string) === 'SYSTEM_ACTION';

      if (isSystem) {
        if (currentSystemCluster.length === 0) {
          currentSystemCluster.push(message);
        } else {
          const prevTime = new Date(
            currentSystemCluster[currentSystemCluster.length - 1].createdAt,
          ).getTime();
          const currTime = new Date(message.createdAt).getTime();
          const diffMinutes = Math.abs(currTime - prevTime) / (1000 * 60);

          if (diffMinutes <= 10) {
            currentSystemCluster.push(message);
          } else {
            flushSystemCluster();
            currentSystemCluster.push(message);
          }
        }
      } else {
        flushSystemCluster();

        const prev = group.messages[index - 1];
        const next = group.messages[index + 1];
        const isPrevSame =
          prev && prev.messageType !== 'SYSTEM' ? isSameSenderAndMinute(prev, message) : false;
        const isNextSame =
          next && next.messageType !== 'SYSTEM' ? isSameSenderAndMinute(message, next) : false;

        let clusterPosition: ClusterPosition = 'single';
        if (!isPrevSame && isNextSame) {
          clusterPosition = 'first';
        } else if (isPrevSame && isNextSame) {
          clusterPosition = 'middle';
        } else if (isPrevSame && !isNextSame) {
          clusterPosition = 'last';
        }

        // Avatar is only displayed on the LAST message of a cluster or on single messages
        const showAvatar = !isNextSame;

        rows.push({
          type: 'message',
          key: message.id,
          message,
          showAvatar,
          clusterPosition,
        });
      }
    });

    flushSystemCluster();
  });
  return rows;
}

export default function MessageList({
  messages,
  currentUserId,
  otherParticipantId,
  conversationId,
  onThemeAccepted,
  otherParticipant,
  display,
  hasMore,
  isLoading,
  isFetchingMore,
  typingParticipants,
  isGroup,
  isSelectionMode = false,
  selectedMessageIds,
  chatTheme,
  onToggleSelectMessage,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onTogglePin,
  onReport,
  onReact,
  onUnreact,
  onMarkRead,
  highlightMessageId,
  onHighlightHandled,
  onJumpToMessage,
  onLoadAround,
  onOpenDatePicker,
  contentMaxWidth,
  highlightDateLabel,
  isAnchoredInHistory = false,
  hasNewer = false,
  isFetchingNewer = false,
  onResetToLive,
  onLoadOlder,
  onLoadNewer,
  onRetry,
  onOpenMedia,
}: MessageListProps) {
  const scrollerElementRef = useRef<HTMLDivElement | null>(null);
  const rows = useMemo(() => buildRows(messages), [messages]);

  const estimateRowSize = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) return 60;
      if (row.type === 'separator') return 44;
      if (row.type === 'system_cluster') return Math.max(40, row.messages.length * 36);
      if (row.type === 'message') {
        const msg = row.message;
        if (msg.messageType === 'CALL_LOG') return 52;
        if (msg.messageType === 'THEME_PROPOSAL') return 160;

        if (msg.attachments && msg.attachments.length > 0) {
          const hasMedia = msg.attachments.some(
            (a) =>
              a.type === 'IMAGE' ||
              a.type === 'GIF' ||
              a.type === 'VIDEO' ||
              isVideoAttachment(a) ||
              isImageAttachment(a),
          );
          if (hasMedia) {
            const primary = msg.attachments.find(
              (a) =>
                a.type === 'IMAGE' ||
                a.type === 'GIF' ||
                a.type === 'VIDEO' ||
                isVideoAttachment(a) ||
                isImageAttachment(a),
            );
            let mediaH = 320;
            if (primary?.width && primary?.height) {
              const ratio = primary.height / primary.width;
              mediaH = Math.min(460, Math.max(180, Math.round(ratio * 360)));
            }
            const extra = (msg.body ? 48 : 0) + (msg.replyTo ? 48 : 0) + 24;
            return mediaH + extra;
          }

          const hasAudio = msg.attachments.some((a) => a.type === 'AUDIO');
          if (hasAudio) return 76 + (msg.body ? 40 : 0);

          const hasFiles = msg.attachments.some((a) => a.type === 'FILE');
          if (hasFiles) return 68 * msg.attachments.length + (msg.body ? 40 : 0);
        }

        const textLen = msg.body?.length || 0;
        let baseH = 52;
        if (textLen > 300) baseH = 160;
        else if (textLen > 150) baseH = 100;
        else if (textLen > 60) baseH = 68;

        if (msg.replyTo) baseH += 44;
        if (msg.forwardedFrom) baseH += 36;
        if (msg.reactions && msg.reactions.length > 0) baseH += 30;

        return baseH;
      }
      return 60;
    },
    [rows],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollerElementRef.current,
    estimateSize: estimateRowSize,
    getItemKey: (index) => rows[index].key,
    overscan: 6,
    initialRect: { width: 500, height: 800 },
  });

  const virtualRows = virtualizer.getVirtualItems();

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const previousRowsCountRef = useRef(rows.length);
  const previousConversationIdRef = useRef(conversationId);
  const viewportAnchor = useRef<{ messageId: string; offset: number } | null>(null);
  const captureViewportAnchor = useCallback(() => {
    const scroller = scrollerElementRef.current;
    if (!scroller) return;
    const bounds = scroller.getBoundingClientRect();
    for (const row of scroller.querySelectorAll<HTMLElement>('[data-message-id]')) {
      const rect = row.getBoundingClientRect();
      if (rect.bottom > bounds.top && rect.top < bounds.bottom) {
        viewportAnchor.current = {
          messageId: row.dataset.messageId!,
          offset: rect.top - bounds.top,
        };
        return;
      }
    }
    // The native scroll offset can change before React mounts the new
    // virtual range. Use the full measurement table rather than leaving an
    // anchor from the previous viewport (or losing the top edge entirely).
    const paddingTop = parseFloat(getComputedStyle(scroller).paddingTop) || 0;
    const top = scroller.scrollTop - paddingTop;
    for (const item of virtualizer.measurementsCache) {
      if (item.end <= top || item.start >= top + scroller.clientHeight) continue;
      const row = rows[item.index];
      const messageId =
        row?.type === 'message'
          ? row.message.id
          : row?.type === 'system_cluster'
            ? row.messages[0]?.id
            : undefined;
      if (messageId) {
        viewportAnchor.current = { messageId, offset: item.start - top };
        return;
      }
    }
  }, [rows, virtualizer]);

  // Restore an identity and its pixel offset before paint. Index-based
  // anchoring breaks when maxPages removes a page at the opposite edge.
  const previousWindow = useRef({ conversationId, rows, isAnchoredInHistory });
  useLayoutEffect(() => {
    const previous = previousWindow.current;
    previousWindow.current = { conversationId, rows, isAnchoredInHistory };
    if (
      previous.conversationId !== conversationId ||
      (previous.isAnchoredInHistory && !isAnchoredInHistory)
    ) {
      viewportAnchor.current = null;
      setShowScrollBottom(false);
      isAtBottomRef.current = true;
      if (rows.length) virtualizer.scrollToIndex(rows.length - 1, { align: 'end' });
      return;
    }
    const anchor = viewportAnchor.current;
    if (!anchor || previous.rows === rows || highlightMessageId) return;
    if (!isAnchoredInHistory && isAtBottomRef.current) return;
    const index = rows.findIndex((row) =>
      row.type === 'message'
        ? row.message.id === anchor.messageId
        : row.type === 'system_cluster' &&
          row.messages.some((message) => message.id === anchor.messageId),
    );
    const offset = index >= 0 ? virtualizer.getOffsetForIndex(index, 'start')?.[0] : undefined;
    if (offset !== undefined) {
      const scroller = scrollerElementRef.current;
      const paddingTop = scroller ? parseFloat(getComputedStyle(scroller).paddingTop) || 0 : 0;
      virtualizer.scrollToOffset(Math.max(0, offset + paddingTop - anchor.offset));
    }
  }, [rows, conversationId, isAnchoredInHistory, highlightMessageId, virtualizer]);

  const handleStartReached = useCallback(() => {
    if (!hasMore || isFetchingMore) return;
    if (isAnchoredInHistory && onLoadOlder) {
      onLoadOlder();
      return;
    }
    onLoadMore();
  }, [hasMore, isAnchoredInHistory, isFetchingMore, onLoadMore, onLoadOlder]);

  const handleEndReached = useCallback(() => {
    if (isAnchoredInHistory && hasNewer && !isFetchingNewer && onLoadNewer) {
      onLoadNewer();
    }
  }, [isAnchoredInHistory, hasNewer, isFetchingNewer, onLoadNewer]);

  const checkScrollPosition = useCallback(() => {
    const el = scrollerElementRef.current;
    if (!el) return;
    captureViewportAnchor();
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = distanceFromBottom <= 40;
    isAtBottomRef.current = isAtBottom;

    // Only appear when the user scrolls up by more than 140px or is in history anchor mode
    const isScrolledUp = distanceFromBottom > 140;
    setShowScrollBottom(isScrolledUp || isAnchoredInHistory);

    if (isAtBottom && !isAnchoredInHistory) {
      setUnreadBelowCount(0);
    }
    if (el.scrollTop < 100) {
      handleStartReached();
    }
    if (distanceFromBottom < 100) {
      handleEndReached();
    }
  }, [isAnchoredInHistory, handleStartReached, handleEndReached, captureViewportAnchor]);

  const isInitialMount = useRef(true);
  const pendingHighlightRequest = useRef<{ key: string } | null>(null);

  useEffect(() => {
    if (rows.length === 0) return;

    const isConvChange = previousConversationIdRef.current !== conversationId;
    previousConversationIdRef.current = conversationId;

    if (isInitialMount.current || isConvChange) {
      isInitialMount.current = false;
      isAtBottomRef.current = true;
      previousRowsCountRef.current = rows.length;
      if (!highlightMessageId) {
        virtualizer.scrollToIndex(rows.length - 1, { align: 'end' });
      }
      return;
    }

    const hasNewMessages = rows.length > previousRowsCountRef.current;
    previousRowsCountRef.current = rows.length;

    // Only auto-scroll to bottom on new messages if the user was already reading at the bottom
    if (hasNewMessages && !isAnchoredInHistory && isAtBottomRef.current) {
      virtualizer.scrollToIndex(rows.length - 1, { align: 'end', behavior: 'smooth' });
    }
  }, [rows.length, conversationId, isAnchoredInHistory, highlightMessageId, virtualizer]);

  const { dockOffset } = useSpotifyDockOffset();

  useEffect(() => {
    // When dock offset changes (dock opens, minimizes, or closes),
    // if the user is reading live messages at the bottom, maintain smooth pinning to bottom.
    if (!isAnchoredInHistory && isAtBottomRef.current && rows.length > 0) {
      const timer = setTimeout(() => {
        virtualizer.scrollToIndex(rows.length - 1, {
          align: 'end',
          behavior: 'smooth',
        });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [dockOffset, isAnchoredInHistory, rows.length, virtualizer]);

  useEffect(() => {
    if (!highlightMessageId) return;
    const relativeIndex = rows.findIndex(
      (r) => r.type === 'message' && r.message.id === highlightMessageId,
    );
    if (relativeIndex !== -1) {
      virtualizer.scrollToIndex(relativeIndex, {
        align: 'center',
        behavior: 'smooth',
      });
      const timeout = setTimeout(() => onHighlightHandled?.(), 1700);
      return () => clearTimeout(timeout);
    } else if (onLoadAround) {
      const key = `${conversationId ?? ''}:${highlightMessageId}`;
      if (pendingHighlightRequest.current?.key === key) return;
      const request = { key };
      pendingHighlightRequest.current = request;
      onLoadAround(highlightMessageId)
        .catch(() => {})
        .finally(() => {
          if (pendingHighlightRequest.current === request) pendingHighlightRequest.current = null;
        });
    }
  }, [conversationId, highlightMessageId, rows, onHighlightHandled, onLoadAround, virtualizer]);

  useEffect(() => {
    if (virtualRows.length === 0) return;
    const lastVisibleItem = virtualRows[virtualRows.length - 1];
    const visibleRows = rows.slice(virtualRows[0].index, lastVisibleItem.index + 1);
    const lastMsgRow = [...visibleRows].reverse().find((r) => r.type === 'message');
    if (
      lastMsgRow &&
      lastMsgRow.type === 'message' &&
      lastMsgRow.message.sender?.id &&
      lastMsgRow.message.sender.id !== currentUserId
    ) {
      onMarkRead?.(lastMsgRow.message.id);
    }

    const belowCount = Math.max(0, rows.length - 1 - lastVisibleItem.index);
    setUnreadBelowCount(belowCount);
  }, [virtualRows, rows, currentUserId, onMarkRead]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto py-4">
        <MessageThreadSkeleton />
      </div>
    );
  }

  if (messages.length === 0) {
    const avatarUrl = otherParticipant?.user.avatar || display?.avatar;
    const name =
      otherParticipant?.nickname ||
      otherParticipant?.user.displayName ||
      otherParticipant?.user.username ||
      display?.title ||
      'User';
    const handle = otherParticipant?.user.username
      ? `@${otherParticipant.user.username}`
      : undefined;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fadeIn select-none">
        <div className="relative mb-4 group">
          <div className="absolute -inset-2 rounded-full bg-linear-to-r from-blue-600 via-indigo-500 to-purple-600 opacity-30 blur-lg group-hover:opacity-60 transition duration-500" />
          <div className="relative p-1 rounded-full bg-[#18181c] border border-white/10 shadow-2xl">
            <Avatar size="xl" src={avatarUrl} />
          </div>
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
          {name}
        </h3>
        {handle && <p className="text-xs text-gray-400 font-medium mt-0.5">{handle}</p>}

        <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
          No messages here yet. Send a greeting to start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div
        ref={scrollerElementRef}
        data-testid="message-scroller"
        onScroll={checkScrollPosition}
        className="flex-1 custom-scrollbar py-2 overflow-y-auto overflow-x-hidden"
        style={{
          overflowAnchor: 'none',
          overflowX: 'hidden',
          transform: 'translateZ(0)',
        }}
      >
        {isFetchingMore && (
          <div
            className="absolute top-0 inset-x-0 z-10 w-full mx-auto px-1 sm:px-2.5 pointer-events-none"
            style={{
              maxWidth: contentMaxWidth ? `${contentMaxWidth}px` : '880px',
            }}
          >
            <OlderMessagesSkeleton />
          </div>
        )}

        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualItem) => {
            const row = rows[virtualItem.index];
            if (!row) return null;

            const rowWrapperClass =
              'w-full mx-auto px-1 sm:px-2.5 transition-[max-width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]';
            const rowWrapperStyle: React.CSSProperties = {
              maxWidth: contentMaxWidth ? `${contentMaxWidth}px` : '880px',
            };

            let rowContent: React.ReactNode = null;

            if (row.type === 'separator') {
              const isHighlighted = highlightDateLabel === row.label;
              rowContent = (
                <div
                  className={`${rowWrapperClass} sticky top-2 z-20 flex justify-center py-2 pointer-events-none`}
                  style={rowWrapperStyle}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onOpenDatePicker?.(row.date, rect);
                    }}
                    className={`px-3.5 py-1 rounded-full bg-[#161722]/95 border border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] text-[11px] font-medium text-gray-300 pointer-events-auto select-none transition-all duration-300 cursor-pointer hover:bg-[#252530] hover:border-purple-400/50 hover:text-purple-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.35)] active:scale-95 group ${
                      isHighlighted ? 'animate-dateJumpPulse ring-2 ring-purple-500/80' : ''
                    }`}
                    title="Click to open calendar date picker"
                  >
                    <span>{row.label}</span>
                  </button>
                </div>
              );
            } else if (row.type === 'system_cluster') {
              rowContent = (
                <div className={rowWrapperClass} style={rowWrapperStyle}>
                  <SystemMessageCluster key={row.key} messages={row.messages} />
                </div>
              );
            } else {
              const { message, showAvatar, clusterPosition } = row;

              if (message.messageType === 'THEME_PROPOSAL') {
                rowContent = (
                  <div className={rowWrapperClass} style={rowWrapperStyle}>
                    <ThemeProposalMessage
                      key={message.id}
                      message={message}
                      currentUserId={currentUserId || ''}
                      conversationId={conversationId || message.conversationId}
                      onThemeAccepted={onThemeAccepted}
                    />
                  </div>
                );
              } else if (message.messageType === 'CALL_LOG') {
                rowContent = (
                  <div className={rowWrapperClass} style={rowWrapperStyle}>
                    <CallHistoryItem
                      key={message.id}
                      message={message}
                      currentUserId={currentUserId}
                    />
                  </div>
                );
              } else {
                const isOwnMessage = Boolean(
                  message.sender?.id && message.sender.id === currentUserId,
                );
                const isReadByOther = otherParticipantId
                  ? message.readBy.includes(otherParticipantId)
                  : false;

                rowContent = (
                  <div className={rowWrapperClass} style={rowWrapperStyle}>
                    <div
                      className={`rounded-2xl transition-all ${
                        highlightMessageId === message.id ? 'animate-jumpHighlight' : ''
                      }`}
                    >
                      <MessageBubble
                        message={message}
                        isOwnMessage={isOwnMessage}
                        showAvatar={showAvatar}
                        isReadByOther={isReadByOther}
                        clusterPosition={clusterPosition}
                        currentUserId={currentUserId}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedMessageIds?.has(message.id)}
                        chatTheme={chatTheme}
                        onToggleSelect={onToggleSelectMessage}
                        onReply={onReply}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onForward={onForward}
                        onTogglePin={onTogglePin}
                        onReport={onReport}
                        onReact={onReact}
                        onUnreact={onUnreact}
                        onJumpToMessage={onJumpToMessage}
                        onRetry={onRetry}
                        onOpenMedia={onOpenMedia}
                        e2eePeerUserId={isGroup ? null : otherParticipantId}
                        peerName={
                          isGroup
                            ? null
                            : otherParticipant?.nickname ||
                              otherParticipant?.user.displayName ||
                              otherParticipant?.user.username ||
                              null
                        }
                      />
                    </div>
                  </div>
                );
              }
            }

            return (
              <div
                key={row.key || virtualItem.key}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                data-message-id={
                  row.type === 'message'
                    ? row.message.id
                    : row.type === 'system_cluster'
                      ? row.messages[0]?.id
                      : undefined
                }
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {rowContent}
              </div>
            );
          })}
        </div>

        <div
          className="w-full mx-auto px-1 sm:px-2.5 transition-[max-width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            maxWidth: contentMaxWidth ? `${contentMaxWidth}px` : '880px',
          }}
        >
          <TypingIndicatorBubble typists={typingParticipants} isGroup={isGroup} />
        </div>
      </div>

      {(showScrollBottom || isAnchoredInHistory) && (
        <div
          className="pointer-events-none absolute bottom-4 inset-x-0 mx-auto px-4 z-30 transition-[max-width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex justify-end"
          style={{
            maxWidth: contentMaxWidth ? `${contentMaxWidth}px` : '880px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (isAnchoredInHistory) {
                onResetToLive?.();
              }
              isAtBottomRef.current = true;
              virtualizer.scrollToIndex(rows.length - 1, {
                align: 'end',
                behavior: 'smooth',
              });
              setShowScrollBottom(false);
              setUnreadBelowCount(0);
            }}
            className="pointer-events-auto group w-10 h-10 rounded-full bg-[#181926]/95 border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center text-gray-300 hover:text-white hover:bg-purple-600/30 hover:border-purple-400/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-200 active:scale-95 animate-popIn cursor-pointer mr-1 sm:mr-2"
            title={isAnchoredInHistory ? 'Jump to live messages' : 'Scroll to bottom'}
          >
            <ChevronDown size={20} className="group-hover:translate-y-0.5 transition-transform" />

            {unreadBelowCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-linear-to-r from-purple-500 to-indigo-500 text-[10.5px] font-bold text-white flex items-center justify-center border-2 border-[#181926] shadow-[0_0_10px_rgba(168,85,247,0.7)] animate-popIn tabular-nums">
                {unreadBelowCount > 99 ? '+99' : `+${unreadBelowCount}`}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
