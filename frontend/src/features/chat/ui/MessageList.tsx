import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ChevronDown } from 'lucide-react';
import { MessageView, UserSnapshot } from '../../../entities/chat/model/types';
import { groupMessagesByDate } from '../lib/groupMessagesByDate';
import MessageBubble from './MessageBubble';
import TypingIndicatorBubble from '@/shared/ui/TypingIndicatorBubble';
import Avatar from '@/shared/ui/Avatar';
import { OlderMessagesSkeleton, MessageThreadSkeleton } from './MessageListSkeletons';

import SystemMessageCluster from './SystemMessageCluster';

export type ClusterPosition = 'single' | 'first' | 'middle' | 'last';

interface MessageListProps {
  messages: MessageView[];
  currentUserId: string | null;
  otherParticipantId: string | null;
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
  typingParticipants: UserSnapshot[];
  isGroup: boolean;
  isSelectionMode?: boolean;
  selectedMessageIds?: Set<string>;
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
}

type Row =
  | { type: 'separator'; key: string; label: string }
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

const START_INDEX = 100000;

function isSameSenderAndMinute(msg1: MessageView, msg2: MessageView): boolean {
  if (msg1.sender.id !== msg2.sender.id) return false;
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
  groups.forEach((group, groupIndex) => {
    rows.push({ type: 'separator', key: `sep-${groupIndex}-${group.label}`, label: group.label });

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
          message.body?.includes('left the conversation') ||
          message.body?.includes('покинул(а) группу') ||
          message.body?.includes('покинул группу') ||
          message.body?.includes('вышел из группы'),
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
  otherParticipant,
  display,
  hasMore,
  isLoading,
  isFetchingMore,
  typingParticipants,
  isGroup,
  isSelectionMode = false,
  selectedMessageIds,
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
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerElementRef = useRef<HTMLElement | null>(null);
  const prevRowsRef = useRef<Row[]>([]);
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);

  const checkScrollPosition = useCallback(() => {
    const el = scrollerElementRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Only appear when the user scrolls up by at least the height of the chat screen (el.clientHeight)
    const isOneScreenUp = el.clientHeight > 0 && distanceFromBottom >= el.clientHeight;
    setShowScrollBottom(isOneScreenUp);
    if (distanceFromBottom <= 20) {
      setUnreadBelowCount(0);
    }
  }, []);

  useEffect(() => {
    const el = scrollerElementRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollPosition, { passive: true });
    return () => el.removeEventListener('scroll', checkScrollPosition);
  }, [checkScrollPosition]);

  const rows = useMemo(() => buildRows(messages), [messages]);

  useLayoutEffect(() => {
    const prevRows = prevRowsRef.current;
    if (prevRows.length > 0 && rows.length > prevRows.length) {
      const prevFirstKey = prevRows[0].key;
      const prependedCount = rows.findIndex((r) => r.key === prevFirstKey);
      if (prependedCount > 0) {
        setFirstItemIndex((idx) => idx - prependedCount);
      }
    }
    prevRowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (!highlightMessageId) return;
    const relativeIndex = rows.findIndex(
      (r) => r.type === 'message' && r.message.id === highlightMessageId,
    );
    if (relativeIndex !== -1) {
      virtuosoRef.current?.scrollToIndex({
        index: firstItemIndex + relativeIndex,
        align: 'center',
        behavior: 'smooth',
      });
      const timeout = setTimeout(() => onHighlightHandled?.(), 1700);
      return () => clearTimeout(timeout);
    } else if (onLoadAround) {
      onLoadAround(highlightMessageId).catch(() => {});
    }
  }, [highlightMessageId, rows, firstItemIndex, onHighlightHandled, onLoadAround]);

  const handleStartReached = () => {
    if (!hasMore || isFetchingMore) return;
    onLoadMore();
  };

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
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 opacity-30 blur-lg group-hover:opacity-60 transition duration-500" />
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
    <div className="relative flex-1 flex flex-col min-h-0">
      <Virtuoso
        ref={virtuosoRef}
        scrollerRef={(ref) => {
          if (ref instanceof HTMLElement) {
            scrollerElementRef.current = ref;
            checkScrollPosition();
          }
        }}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={Math.max(0, rows.length - 1)}
        data={rows}
        startReached={handleStartReached}
        atBottomStateChange={(atBottom) => {
          if (atBottom) {
            setShowScrollBottom(false);
            setUnreadBelowCount(0);
          } else {
            checkScrollPosition();
          }
        }}
        followOutput="smooth"
        className="flex-1 custom-scrollbar py-2"
        style={{ overflowAnchor: 'auto' }}
        rangeChanged={(range) => {
          checkScrollPosition();
          const visibleRows = rows.slice(
            Math.max(0, range.startIndex - firstItemIndex),
            Math.max(0, range.endIndex - firstItemIndex + 1),
          );
          const lastMsgRow = [...visibleRows].reverse().find((r) => r.type === 'message');
          if (
            lastMsgRow &&
            lastMsgRow.type === 'message' &&
            lastMsgRow.message.sender.id !== currentUserId
          ) {
            onMarkRead?.(lastMsgRow.message.id);
          }

          const bottomRowIndex = Math.max(0, range.endIndex - firstItemIndex);
          const belowCount = Math.max(0, rows.length - 1 - bottomRowIndex);
          setUnreadBelowCount(belowCount);
        }}
        components={{
          Header: () => (isFetchingMore ? <OlderMessagesSkeleton /> : null),
          Footer: () => <TypingIndicatorBubble typists={typingParticipants} isGroup={isGroup} />,
        }}
        itemContent={(_index: number, row: Row) => {
          if (row.type === 'separator') {
            return (
              <div className="sticky top-2 z-20 flex justify-center my-3 pointer-events-none">
                <div className="px-3.5 py-1 rounded-full bg-[#18181b]/80 border border-white/10 backdrop-blur-md shadow-md text-[11px] font-medium text-gray-300 pointer-events-auto select-none transition-all">
                  {row.label}
                </div>
              </div>
            );
          }

          if (row.type === 'system_cluster') {
            return <SystemMessageCluster key={row.key} messages={row.messages} />;
          }

          const { message, showAvatar, clusterPosition } = row;
          const isOwnMessage = message.sender.id === currentUserId;
          const isReadByOther = otherParticipantId
            ? message.readBy.includes(otherParticipantId)
            : false;

          return (
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
              />
            </div>
          );
        }}
      />

      {showScrollBottom && (
        <button
          type="button"
          onClick={() => {
            virtuosoRef.current?.scrollToIndex({
              index: firstItemIndex + rows.length - 1,
              align: 'end',
              behavior: 'smooth',
            });
            setShowScrollBottom(false);
            setUnreadBelowCount(0);
          }}
          className="group absolute bottom-4 right-4 sm:right-6 z-30 w-10 h-10 rounded-full bg-[#181926]/90 border border-white/15 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-center text-gray-300 hover:text-white hover:bg-purple-600/30 hover:border-purple-400/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-200 active:scale-95 animate-popIn cursor-pointer"
          title="Scroll to bottom"
        >
          <ChevronDown size={20} className="group-hover:translate-y-0.5 transition-transform" />

          {unreadBelowCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-[10.5px] font-bold text-white flex items-center justify-center border-2 border-[#181926] shadow-[0_0_10px_rgba(168,85,247,0.7)] animate-popIn tabular-nums">
              {unreadBelowCount > 99 ? '+99' : `+${unreadBelowCount}`}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
