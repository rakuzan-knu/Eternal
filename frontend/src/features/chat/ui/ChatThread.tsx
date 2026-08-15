import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { ConversationView, MessageView } from '../../../entities/chat/model/types';
import { getConversationDisplay } from '../lib/getConversationDisplay';
import { useMessages } from '../model/useMessages';
import { useMessageActions } from '../model/useMessageActions';
import { useConversationRealtime } from '../model/useConversationRealtime';
import { useQueryOnlineStatus } from '../model/usePresence';
import { useStagedAttachments } from '@/shared/model/useStagedAttachments';
import { chatApi } from '../api/chatApi';
import ChatThreadHeader from './ChatThreadHeader';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import BlockedComposerBanner from './BlockedComposerBanner';
import ForwardMessageModal from './ForwardMessageModal';
import AttachmentDropZone from '@/shared/ui/AttachmentDropZone';
import ConversationDetailsPanel from './ConversationDetailsPanel';
import MessageSearchPanel from './MessageSearchPanel';

interface ChatThreadProps {
  conversation: ConversationView;
}

type RightPanel = 'details' | 'search' | null;

export default function ChatThread({ conversation }: ChatThreadProps) {
  const { userId } = useAuthStore();
  const [searchParams] = useSearchParams();
  const initialMessageId = searchParams.get('messageId');
  const display = getConversationDisplay(conversation, userId);
  const otherParticipant =
    conversation.type === 'GROUP'
      ? undefined
      : conversation.participants.find((p) => p.userId !== userId);

  useQueryOnlineStatus(otherParticipant ? [otherParticipant.userId] : []);

  const {
    messages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: isLoadingMessages,
  } = useMessages(conversation.id);
  const { typingUserIds } = useConversationRealtime(conversation.id);
  const actions = useMessageActions(conversation.id);

  const [replyingTo, setReplyingTo] = useState<MessageView | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<MessageView | null>(null);
  const staged = useStagedAttachments();
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(initialMessageId);

  const isOtherTyping = otherParticipant ? typingUserIds.has(otherParticipant.userId) : false;
  const typingParticipants = conversation.participants
    .filter((p) => typingUserIds.has(p.userId))
    .map((p) => p.user);

  const isBlocked = conversation.type !== 'GROUP' && conversation.isBlocked;

  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    actionsRef.current.markRead();
  }, [conversation.id]);

  const [highlightResetKey, setHighlightResetKey] = useState(
    `${conversation.id}:${initialMessageId}`,
  );
  const currentHighlightKey = `${conversation.id}:${initialMessageId}`;
  if (currentHighlightKey !== highlightResetKey) {
    setHighlightResetKey(currentHighlightKey);
    setHighlightMessageId(initialMessageId);
  }

  useEffect(() => {
    if (!highlightMessageId) return;
    const alreadyLoaded = messages.some((m) => m.id === highlightMessageId);
    if (!alreadyLoaded && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [highlightMessageId, messages, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleJumpToMessage = (messageId: string) => {
    setRightPanel(null);
    setHighlightMessageId(messageId);
  };

  const handleDelete = (messageId: string, forAll: boolean) => {
    actions.deleteMessage(messageId, forAll).catch(() => {});
  };

  const handleTogglePin = (message: MessageView) => {
    if (message.isPinned) actions.unpinMessage(message.id).catch(() => {});
    else actions.pinMessage(message.id).catch(() => {});
  };

  const handleReport = (message: MessageView) => {
    if (!otherParticipant) return;
    chatApi.reportUser(otherParticipant.userId, 'MESSAGE', message.id);
  };

  return (
    <div className="flex-1 flex h-full min-w-0">
      <div className="flex-1 flex flex-col h-full min-w-0">
        <ChatThreadHeader
          display={display}
          otherUserId={otherParticipant?.userId ?? null}
          isOtherTyping={isOtherTyping}
          isDetailsOpen={rightPanel === 'details'}
          onToggleDetails={() => setRightPanel((p) => (p === 'details' ? null : 'details'))}
          isGroup={conversation.type === 'GROUP'}
          memberAvatars={conversation.participants.map((p) => p.user.avatar)}
          memberCount={conversation.participants.length}
        />

        <AttachmentDropZone onFilesDropped={staged.addFiles}>
          <MessageList
            messages={messages}
            currentUserId={userId}
            otherParticipantId={otherParticipant?.userId ?? null}
            otherParticipant={otherParticipant}
            display={display}
            hasMore={!!hasNextPage}
            isLoading={isLoadingMessages}
            isFetchingMore={isFetchingNextPage}
            typingParticipants={typingParticipants}
            isGroup={conversation.type === 'GROUP'}
            onLoadMore={fetchNextPage}
            onReply={setReplyingTo}
            onEdit={(message) => {
              const nextBody = window.prompt('Edit message', message.body ?? '');
              if (nextBody && nextBody !== message.body)
                actions.editMessage(message.id, nextBody).catch(() => {});
            }}
            onDelete={handleDelete}
            onForward={setForwardingMessage}
            onTogglePin={handleTogglePin}
            onReport={handleReport}
            onReact={actions.addReaction}
            onUnreact={actions.removeReaction}
            onMarkRead={actions.markRead}
            highlightMessageId={highlightMessageId}
            onHighlightHandled={() => setHighlightMessageId(null)}
          />

          {isBlocked && otherParticipant ? (
            <BlockedComposerBanner
              otherUserId={otherParticipant.userId}
              blockedByMe={conversation.blockedByMe}
              blockingMe={conversation.blockingMe}
            />
          ) : (
            <MessageComposer
              actions={actions}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              stagedFiles={staged.files}
              stagedFilesError={staged.error}
              onAddFiles={staged.addFiles}
              onRemoveFile={staged.removeFile}
              onReplaceFile={staged.replaceFile}
              onClearFiles={staged.clear}
              onDismissFilesError={staged.dismissError}
              isGroup={conversation.type === 'GROUP'}
            />
          )}
        </AttachmentDropZone>

        {forwardingMessage && (
          <ForwardMessageModal
            onClose={() => setForwardingMessage(null)}
            onForward={(conversationIds) => {
              actions.forwardMessage(forwardingMessage.id, conversationIds).catch(() => {});
              setForwardingMessage(null);
            }}
          />
        )}
      </div>

      {rightPanel === 'details' && (
        <ConversationDetailsPanel
          conversation={conversation}
          display={display}
          otherUserId={otherParticipant?.userId ?? null}
          messages={messages}
          onClose={() => setRightPanel(null)}
          onOpenSearch={() => setRightPanel('search')}
          onJumpToMessage={handleJumpToMessage}
        />
      )}

      {rightPanel === 'search' && (
        <MessageSearchPanel
          conversationId={conversation.id}
          onClose={() => setRightPanel(null)}
          onJumpToMessage={handleJumpToMessage}
        />
      )}
    </div>
  );
}
