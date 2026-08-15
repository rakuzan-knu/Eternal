import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { MessageView, UserSnapshot } from '../../../entities/chat/model/types';
import { groupMessagesByDate } from '../lib/groupMessagesByDate';
import MessageBubble from './MessageBubble';
import TypingIndicatorBubble from '@/shared/ui/TypingIndicatorBubble';
import Avatar from '@/shared/ui/Avatar';
import { OlderMessagesSkeleton, MessageThreadSkeleton } from './MessageListSkeletons';

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
}

type Row =
  | { type: 'separator'; key: string; label: string }
  | {
      type: 'message';
      key: string;
      message: MessageView;
      showAvatar: boolean;
      clusterPosition: ClusterPosition;
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
    group.messages.forEach((message, index) => {
      const prev = group.messages[index - 1];
      const next = group.messages[index + 1];
      const isPrevSame = prev ? isSameSenderAndMinute(prev, message) : false;
      const isNextSame = next ? isSameSenderAndMinute(message, next) : false;

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
    });
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
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const prevRowsRef = useRef<Row[]>([]);
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

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
    if (relativeIndex === -1) return;
    virtuosoRef.current?.scrollToIndex({
      index: firstItemIndex + relativeIndex,
      align: 'center',
      behavior: 'smooth',
    });
    const timeout = setTimeout(() => onHighlightHandled?.(), 1700);
    return () => clearTimeout(timeout);
  }, [highlightMessageId, rows, firstItemIndex, onHighlightHandled]);

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

        <p className="text-sm text-gray-300 max-w-sm mt-4 leading-relaxed font-normal bg-white/[0.04] px-5 py-2.5 rounded-2xl border border-white/[0.08] backdrop-blur-md shadow-inner">
          Start your adventure with this user now.
        </p>
      </div>
    );
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      className="flex-1 py-4"
      data={rows}
      firstItemIndex={firstItemIndex}
      initialTopMostItemIndex={Math.max(rows.length - 1, 0)}
      alignToBottom
      followOutput="auto"
      startReached={handleStartReached}
      rangeChanged={(range) => {
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

        const { message, showAvatar, clusterPosition } = row;
        const isOwnMessage = message.sender.id === currentUserId;
        const isReadByOther = otherParticipantId
          ? message.readBy.includes(otherParticipantId)
          : false;

        return (
          <div
            className={`rounded-2xl ${highlightMessageId === message.id ? 'animate-jumpHighlight' : ''}`}
          >
            <MessageBubble
              message={message}
              isOwnMessage={isOwnMessage}
              showAvatar={showAvatar}
              isReadByOther={isReadByOther}
              clusterPosition={clusterPosition}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onForward={onForward}
              onTogglePin={onTogglePin}
              onReport={onReport}
              onReact={onReact}
              onUnreact={onUnreact}
            />
          </div>
        );
      }}
    />
  );
}
