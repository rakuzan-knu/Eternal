import React, { useState } from 'react';
import { ArchiveRestore, Lock } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import GroupAvatarCollage from '@/shared/ui/GroupAvatarCollage';
import OnlineStatusIndicator from '@/shared/ui/OnlineStatusIndicator';
import AttachmentDropZone from '@/shared/ui/AttachmentDropZone';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useStagedAttachments } from '@/shared/model/useStagedAttachments';
import { ConversationView, MessageView } from '../../../entities/chat/model/types';
import { useArchiveConversation } from '../model/useConversationMutations';
import { useMessages } from '../model/useMessages';
import { useMessageActions } from '../model/useMessageActions';
import { getConversationDisplay } from '../lib/getConversationDisplay';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import ForwardMessageModal from './ForwardMessageModal';

interface ArchivedThreadPaneProps {
  conversation: ConversationView;
  onUnarchived: () => void;
}

export default function ArchivedThreadPane({
  conversation,
  onUnarchived,
}: ArchivedThreadPaneProps) {
  const { userId } = useAuthStore();
  const display = getConversationDisplay(conversation, userId);
  const isGroup = conversation.type === 'GROUP';
  const otherParticipant = isGroup
    ? undefined
    : conversation.participants.find((p) => p.userId !== userId);

  const {
    messages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: isLoadingMessages,
  } = useMessages(conversation.id);
  const actions = useMessageActions(conversation.id);
  const archiveConversation = useArchiveConversation();
  const staged = useStagedAttachments();

  const [replyingTo, setReplyingTo] = useState<MessageView | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<MessageView | null>(null);

  const handleUnarchive = () => {
    archiveConversation.mutate({ conversationId: conversation.id, archived: false });
    onUnarchived();
  };

  const handleDelete = (messageId: string, forAll: boolean) => {
    actions.deleteMessage(messageId, forAll).catch(() => {});
  };

  const handleTogglePin = (message: MessageView) => {
    if (message.isPinned) actions.unpinMessage(message.id).catch(() => {});
    else actions.pinMessage(message.id).catch(() => {});
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            {isGroup ? (
              <GroupAvatarCollage
                avatars={conversation.participants.map((p) => p.user.avatar)}
                size={36}
              />
            ) : (
              <>
                <Avatar size="sm" src={display.avatar} />
                {otherParticipant && (
                  <OnlineStatusIndicator userId={otherParticipant.userId} variant="dot" />
                )}
              </>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{display.title}</p>
            <p className="flex items-center gap-1.5 truncate text-[12px] text-gray-500">
              <Lock size={11} className="flex-shrink-0" />
              Secured archived chat
            </p>
          </div>
        </div>

        <button
          onClick={handleUnarchive}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[13px] font-semibold text-gray-100 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
        >
          <ArchiveRestore size={15} />
          Unarchive
        </button>
      </div>

      <AttachmentDropZone onFilesDropped={staged.addFiles}>
        <MessageList
          messages={messages}
          currentUserId={userId}
          otherParticipantId={otherParticipant?.userId ?? null}
          hasMore={!!hasNextPage}
          isLoading={isLoadingMessages}
          isFetchingMore={isFetchingNextPage}
          typingParticipants={[]}
          isGroup={isGroup}
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
          onReport={() => {}}
          onReact={actions.addReaction}
          onUnreact={actions.removeReaction}
        />

        <MessageComposer
          conversationId={conversation.id}
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
          isGroup={isGroup}
        />
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
  );
}
