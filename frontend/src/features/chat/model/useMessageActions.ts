import { useCallback, useRef } from 'react';
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

      const optimisticId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const optimisticMessage: MessageView = {
        id: optimisticId,
        tempId: optimisticId,
        clientMessageId: optimisticId,
        status: 'SENDING',
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
          clientMessageId: optimisticId,
        });
        if (res.message) {
          const real = { ...res.message, status: 'SENT' as const };
          updatePages((pages) =>
            pages.map((p) => ({
              ...p,
              data: p.data.map((m) =>
                m.id === optimisticId || m.tempId === optimisticId ? real : m,
              ),
            })),
          );
        }
      } catch (err) {
        updatePages((pages) =>
          pages.map((p) => ({
            ...p,
            data: p.data.map((m) =>
              m.id === optimisticId ? { ...m, status: 'ERROR' as const } : m,
            ),
          })),
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

  const lastTypingSentAtRef = useRef<number>(0);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      const now = Date.now();
      if (isTyping) {
        if (now - lastTypingSentAtRef.current < 4000) return;
        lastTypingSentAtRef.current = now;
        socket.emit('typingStart', { conversationId });
      } else {
        lastTypingSentAtRef.current = 0;
        socket.emit('typingStop', { conversationId });
      }
    },
    [socket, conversationId],
  );

  const lastReadMessageIdRef = useRef<string | null>(null);
  const markReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const markRead = useCallback(
    (lastReadMessageId?: string) => {
      if (!conversationId) return;
      if (lastReadMessageId && lastReadMessageIdRef.current === lastReadMessageId) return;
      if (lastReadMessageId) lastReadMessageIdRef.current = lastReadMessageId;

      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }

      markReadTimeoutRef.current = setTimeout(() => {
        queryClient.setQueryData<ConversationView[]>([CONVERSATIONS_KEY], (prev) =>
          prev?.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
          ),
        );
        socket.emit('markRead', { conversationId, messageId: lastReadMessageId });
      }, 350);
    },
    [socket, conversationId, queryClient],
  );

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
