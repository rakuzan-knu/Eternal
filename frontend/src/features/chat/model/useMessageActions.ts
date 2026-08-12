import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatSocket } from './useChatSocket';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { CONVERSATION_MESSAGES_KEY, CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { chatApi } from '../api/chatApi';
import {
  AttachmentView,
  ConversationView,
  InfiniteMessagesData,
  MessageView,
  OutgoingAttachment,
  PaginatedMessages,
} from '../../../entities/chat/model/types';
import { AckResponse } from './chatSocketTypes';

function emitWithAck<T = unknown>(
  socket: ReturnType<typeof useChatSocket>,
  event: string,
  payload: object,
): Promise<AckResponse<T>> {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res: AckResponse<T>) => {
      if (!res || res.status === 'error') {
        reject(new Error(res?.error ?? `${event} failed`));
        return;
      }
      resolve(res);
    });
  });
}

export function useMessageActions(conversationId: string | null) {
  const socket = useChatSocket();
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  const updatePages = useCallback(
    (updater: (pages: PaginatedMessages[]) => PaginatedMessages[]) => {
      if (!conversationId) return;
      queryClient.setQueryData<InfiniteMessagesData>(
        [CONVERSATION_MESSAGES_KEY, conversationId],
        (prev) => (prev ? { ...prev, pages: updater(prev.pages) } : prev),
      );
    },
    [conversationId, queryClient],
  );

  const uploadAttachment = useCallback(
    (file: File, onProgress?: (percent: number) => void) => {
      if (!conversationId) return Promise.reject(new Error('No active conversation'));
      return chatApi.uploadAttachment(
        conversationId,
        file,
        onProgress,
      ) as Promise<OutgoingAttachment>;
    },
    [conversationId],
  );

  const sendMessage = useCallback(
    async (text: string, replyToId?: string, attachments?: OutgoingAttachment[]) => {
      if (!conversationId) return;
      if (!text.trim() && (!attachments || attachments.length === 0)) return;

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: MessageView = {
        id: optimisticId,
        conversationId,
        sender: { id: userId ?? '', username: '', displayName: null, avatar: null },
        body: text || null,
        messageType: attachments?.[0]?.type === 'GIF' ? 'GIF' : text ? 'TEXT' : 'FILE',
        replyTo: null,
        forwardedFrom: null,
        attachments: (attachments ?? []).map((a, i) => ({
          id: `optimistic-attachment-${i}`,
          type: a.type,
          url: a.url,
          fileName: a.fileName ?? null,
          mimeType: a.mimeType ?? null,
          size: a.size ?? null,
          width: null,
          height: null,
          duration: null,
          thumbnailUrl: null,
        })) as AttachmentView[],
        reactions: [],
        readBy: [],
        isEdited: false,
        isDeleted: false,
        isPinned: false,
        createdAt: new Date().toISOString(),
        editedAt: null,
      };

      updatePages((pages) => {
        if (pages.length === 0)
          return [{ data: [optimisticMessage], hasMore: false, nextCursor: null }];
        const next = [...pages];
        next[0] = { ...next[0], data: [optimisticMessage, ...next[0].data] };
        return next;
      });

      try {
        const res = await emitWithAck<MessageView>(socket, 'sendMessage', {
          conversationId,
          text: text || undefined,
          replyToId,
          attachments,
        });
        if (res.message) {
          const real = res.message;
          updatePages((pages) =>
            pages.map((p) => ({
              ...p,
              data: p.data.map((m) => (m.id === optimisticId ? real : m)),
            })),
          );
        }
      } catch (err) {
        updatePages((pages) =>
          pages.map((p) => ({ ...p, data: p.data.filter((m) => m.id !== optimisticId) })),
        );
        throw err;
      }
    },
    [conversationId, socket, updatePages, userId],
  );

  const editMessage = useCallback(
    (messageId: string, body: string) => emitWithAck(socket, 'editMessage', { messageId, body }),
    [socket],
  );

  const deleteMessage = useCallback(
    (messageId: string, forAll: boolean) =>
      emitWithAck(socket, 'deleteMessage', { messageId, forAll }),
    [socket],
  );

  const forwardMessage = useCallback(
    (messageId: string, conversationIds: string[]) =>
      emitWithAck(socket, 'forwardMessage', { messageId, conversationIds }),
    [socket],
  );

  const addReaction = useCallback(
    (messageId: string, emoji: string) => emitWithAck(socket, 'addReaction', { messageId, emoji }),
    [socket],
  );

  const removeReaction = useCallback(
    (messageId: string, emoji: string) =>
      emitWithAck(socket, 'removeReaction', { messageId, emoji }),
    [socket],
  );

  const pinMessage = useCallback(
    (messageId: string) => {
      if (!conversationId) return Promise.resolve();
      return emitWithAck(socket, 'pinMessage', { conversationId, messageId });
    },
    [socket, conversationId],
  );

  const unpinMessage = useCallback(
    (messageId: string) => {
      if (!conversationId) return Promise.resolve();
      return emitWithAck(socket, 'unpinMessage', { conversationId, messageId });
    },
    [socket, conversationId],
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      socket.emit(isTyping ? 'typingStart' : 'typingStop', { conversationId });
    },
    [socket, conversationId],
  );

  const markRead = useCallback(() => {
    if (!conversationId) return;
    queryClient.setQueryData<ConversationView[]>([CONVERSATIONS_KEY], (prev) =>
      prev?.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
    socket.emit('markRead', { conversationId });
  }, [socket, conversationId, queryClient]);

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    forwardMessage,
    addReaction,
    removeReaction,
    pinMessage,
    unpinMessage,
    setTyping,
    markRead,
    uploadAttachment,
  };
}
