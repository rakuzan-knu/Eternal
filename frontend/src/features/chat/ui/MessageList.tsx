import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { MessageView, UserSnapshot } from '../../../entities/chat/model/types';
import { groupMessagesByDate } from '../lib/groupMessagesByDate';
import MessageBubble from './MessageBubble';
import TypingIndicatorBubble from '@/shared/ui/TypingIndicatorBubble';
import { OlderMessagesSkeleton, MessageThreadSkeleton } from './MessageListSkeletons';

interface MessageListProps {
  messages: MessageView[];
  currentUserId: string | null;
  otherParticipantId: string | null;
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
  highlightMessageId?: string | null;
  onHighlightHandled?: () => void;
}

type Row =
  | { type: 'separator'; key: string; label: string }
  | { type: 'message'; key: string; message: MessageView; showAvatar: boolean };

const START_INDEX = 100000;

function buildRows(messages: MessageView[]): Row[] {
  const groups = groupMessagesByDate(messages);
  const rows: Row[] = [];
  groups.forEach((group, groupIndex) => {
    rows.push({ type: 'separator', key: `sep-${groupIndex}-${group.label}`, label: group.label });
    group.messages.forEach((message, index) => {
      const prev = group.messages[index - 1];
      const showAvatar = !prev || prev.sender.id !== message.sender.id;
      rows.push({ type: 'message', key: message.id, message, showAvatar });
    });
  });
  return rows;
}

export default function MessageList({
  messages,
  currentUserId,
  otherParticipantId,
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
      components={{
        Header: () => (isFetchingMore ? <OlderMessagesSkeleton /> : null),
        Footer: () => <TypingIndicatorBubble typists={typingParticipants} isGroup={isGroup} />,
      }}
      itemContent={(_index, row) => {
        if (row.type === 'separator') {
          return (
            <div className="flex items-center gap-3 px-4 my-3">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">
                {row.label}
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          );
        }

        const { message, showAvatar } = row;
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
