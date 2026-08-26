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
  timeoutMs = 6000,
): Promise<AckResponse<T>> {
  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      timeoutId = null;
      resolve({ status: 'ok' });
    }, timeoutMs);

    socket.emit(event, payload, (res: AckResponse<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
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
        (prev: InfiniteMessagesData | undefined) =>
          prev ? { ...prev, pages: updater(prev.pages) } : prev,
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

      const resolvedMessageType =
        attachments?.[0]?.type === 'GIF'
          ? 'GIF'
          : attachments?.[0]?.type === 'AUDIO'
            ? 'AUDIO'
            : attachments?.[0]?.type === 'VIDEO'
              ? 'VIDEO'
              : attachments?.[0]?.type === 'IMAGE'
                ? 'IMAGE'
                : text
                  ? 'TEXT'
                  : attachments?.length
                    ? 'FILE'
                    : 'TEXT';

      const optimisticId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const optimisticMessage: MessageView = {
        id: optimisticId,
        tempId: optimisticId,
        clientMessageId: optimisticId,
        status: 'SENDING',
        conversationId,
        sender: { id: userId ?? '', username: '', displayName: null, avatar: null },
        body: text || null,
        messageType: resolvedMessageType,
        replyTo: null,
        forwardedFrom: null,
        attachments: (attachments ?? []).map((a, i) => ({
          id: `optimistic-attachment-${i}`,
          type: a.type,
          url: a.url,
          fileName: a.fileName ?? null,
          mimeType: a.mimeType ?? null,
          size: a.size != null ? Math.round(a.size) : null,
          width: a.width != null ? Math.round(a.width) : null,
          height: a.height != null ? Math.round(a.height) : null,
          duration: a.duration != null ? Math.round(a.duration) : null,
          waveform: a.waveform,
          isSpoiler: a.isSpoiler,
          thumbnailUrl: a.thumbnailUrl ?? null,
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
          messageType: resolvedMessageType,
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
        try {
          const fallbackRes = await chatApi.sendMessage(conversationId, {
            text: text || undefined,
            messageType: resolvedMessageType,
            replyToId,
            attachments,
            clientMessageId: optimisticId,
          });
          if (fallbackRes) {
            const real = { ...(fallbackRes as MessageView), status: 'SENT' as const };
            updatePages((pages) =>
              pages.map((p) => ({
                ...p,
                data: p.data.map((m) =>
                  m.id === optimisticId || m.tempId === optimisticId ? real : m,
                ),
              })),
            );
            return;
          }
        } catch {
          // both socket and http failed
        }
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
    async (messageId: string, forAll: boolean) => {
      updatePages((pages) =>
        pages.map((p) => ({
          ...p,
          data: p.data.map((m) =>
            m.id === messageId ? { ...m, isDeleted: true, body: null, attachments: [] } : m,
          ),
        })),
      );
      return emitWithAck(socket, 'deleteMessage', { messageId, forAll });
    },
    [socket, updatePages],
  );

  const forwardMessage = useCallback(
    (messageId: string, conversationIds: string[]) =>
      emitWithAck(socket, 'forwardMessage', { messageId, conversationIds }),
    [socket],
  );

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const currentUserId = useAuthStore.getState().userId;
      updatePages((pages) =>
        pages.map((p) => ({
          ...p,
          data: p.data.map((m) => {
            if (m.id !== messageId) return m;

            // 1. Remove/decrement previous self reaction if different emoji
            const nextReactions = m.reactions
              .map((r) => {
                if (r.selfReacted && r.emoji !== emoji) {
                  return {
                    ...r,
                    count: Math.max(0, r.count - 1),
                    selfReacted: false,
                    users: currentUserId
                      ? (r.users || []).filter((u) => u.id !== currentUserId)
                      : r.users || [],
                  };
                }
                return r;
              })
              .filter((r) => r.count > 0);

            // 2. Add or increment new reaction
            const existingIdx = nextReactions.findIndex((r) => r.emoji === emoji);
            if (existingIdx !== -1) {
              const prev = nextReactions[existingIdx];
              nextReactions[existingIdx] = {
                ...prev,
                count: prev.selfReacted ? prev.count : prev.count + 1,
                selfReacted: true,
                users:
                  currentUserId && !(prev.users || []).some((u) => u.id === currentUserId)
                    ? [
                        ...(prev.users || []),
                        { id: currentUserId, username: '', displayName: null, avatar: null },
                      ]
                    : prev.users || [],
              };
            } else {
              nextReactions.push({
                emoji,
                count: 1,
                selfReacted: true,
                users: currentUserId
                  ? [{ id: currentUserId, username: '', displayName: null, avatar: null }]
                  : [],
              });
            }

            return { ...m, reactions: nextReactions };
          }),
        })),
      );

      try {
        await emitWithAck(socket, 'addReaction', { messageId, emoji });
      } catch (err) {
        console.error('Failed to add reaction:', err);
      }
    },
    [socket, updatePages],
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const currentUserId = useAuthStore.getState().userId;
      updatePages((pages) =>
        pages.map((p) => ({
          ...p,
          data: p.data.map((m) => {
            if (m.id !== messageId) return m;
            const existingIdx = m.reactions.findIndex((r) => r.emoji === emoji);
            if (existingIdx === -1) return m;
            let nextReactions = [...m.reactions];
            const prev = nextReactions[existingIdx];
            if (prev.count <= 1) {
              nextReactions = nextReactions.filter((r) => r.emoji !== emoji);
            } else {
              nextReactions[existingIdx] = {
                ...prev,
                count: prev.selfReacted ? prev.count - 1 : prev.count,
                selfReacted: false,
                users: currentUserId
                  ? (prev.users || []).filter((u) => u.id !== currentUserId)
                  : prev.users || [],
              };
            }
            return { ...m, reactions: nextReactions };
          }),
        })),
      );

      try {
        await emitWithAck(socket, 'removeReaction', { messageId, emoji });
      } catch (err) {
        console.error('Failed to remove reaction:', err);
      }
    },
    [socket, updatePages],
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
        queryClient.setQueryData<ConversationView[]>(
          [CONVERSATIONS_KEY],
          (prev: ConversationView[] | undefined) =>
            prev?.map((conversation: ConversationView) =>
              conversation.id === conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation,
            ),
        );
        socket.emit('markRead', { conversationId, messageId: lastReadMessageId });
        chatApi.markRead(conversationId).catch(() => {});
      }, 350);
    },
    [socket, conversationId, queryClient],
  );

  const batchDeleteMessages = useCallback(
    async (messageIds: string[], forAll: boolean) => {
      if (!conversationId || messageIds.length === 0) return;
      const res = await chatApi.batchDeleteMessages(conversationId, messageIds, forAll);
      updatePages((pages) =>
        pages.map((p) => ({
          ...p,
          data: p.data.map((m) => {
            if (messageIds.includes(m.id)) {
              return { ...m, isDeleted: true, body: null, attachments: [] };
            }
            return m;
          }),
        })),
      );
      return res;
    },
    [conversationId, updatePages],
  );

  const batchForwardMessages = useCallback(
    async (messageIds: string[], conversationIds: string[], hideAuthor = false) => {
      if (!conversationId || messageIds.length === 0 || conversationIds.length === 0) return;
      return chatApi.batchForwardMessages(conversationId, messageIds, conversationIds, hideAuthor);
    },
    [conversationId],
  );

  const loadAroundMessages = useCallback(
    async (messageId: string) => {
      if (!conversationId) return;
      const res = await chatApi.getMessagesAround(conversationId, messageId);
      if (res && res.data) {
        updatePages((pages) => {
          if (pages.length === 0) return [res];
          const existingIds = new Set(pages.flatMap((p) => p.data.map((m) => m.id)));
          const newMessages = res.data.filter((m) => !existingIds.has(m.id));
          if (newMessages.length === 0) return pages;
          const merged = [...pages[0].data, ...newMessages].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          return [{ ...pages[0], data: merged }, ...pages.slice(1)];
        });
      }
      return res;
    },
    [conversationId, updatePages],
  );

  const loadAroundDate = useCallback(
    async (dateIso: string) => {
      if (!conversationId) return;
      const res = await chatApi.getMessagesAroundDate(conversationId, dateIso);
      if (res && res.data) {
        updatePages((pages) => {
          if (pages.length === 0) return [res];
          const existingIds = new Set(pages.flatMap((p) => p.data.map((m) => m.id)));
          const newMessages = res.data.filter((m) => !existingIds.has(m.id));
          if (newMessages.length === 0) return pages;
          const merged = [...pages[0].data, ...newMessages].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          return [{ ...pages[0], data: merged }, ...pages.slice(1)];
        });
      }
      return res;
    },
    [conversationId, updatePages],
  );

  const loadOlderMessages = useCallback(
    async (beforeMessageId: string) => {
      if (!conversationId) return;
      const res = await chatApi.getMessages(conversationId, beforeMessageId, 50);
      if (res && res.data && res.data.length > 0) {
        updatePages((pages) => {
          const existingIds = new Set(pages.flatMap((p) => p.data.map((m) => m.id)));
          const newMessages = res.data.filter((m) => !existingIds.has(m.id));
          if (newMessages.length === 0) return pages;
          const merged = [...pages[0].data, ...newMessages].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          return [
            { ...pages[0], data: merged, hasMore: res.hasMore, nextCursor: res.nextCursor },
            ...pages.slice(1),
          ];
        });
      }
      return res;
    },
    [conversationId, updatePages],
  );

  const loadNewerMessages = useCallback(
    async (afterMessageId: string) => {
      if (!conversationId) return;
      const res = await chatApi.getMessages(conversationId, undefined, 50, afterMessageId);
      if (res && res.data && res.data.length > 0) {
        updatePages((pages) => {
          const existingIds = new Set(pages.flatMap((p) => p.data.map((m) => m.id)));
          const newMessages = res.data.filter((m) => !existingIds.has(m.id));
          if (newMessages.length === 0) return pages;
          const merged = [...pages[0].data, ...newMessages].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          return [{ ...pages[0], data: merged }, ...pages.slice(1)];
        });
      }
      return res;
    },
    [conversationId, updatePages],
  );

  const resetToLive = useCallback(async () => {
    if (!conversationId) return;
    await queryClient.invalidateQueries({
      queryKey: [CONVERSATION_MESSAGES_KEY, conversationId],
    });
  }, [conversationId, queryClient]);

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    batchDeleteMessages,
    forwardMessage,
    batchForwardMessages,
    loadAroundMessages,
    loadAroundDate,
    loadOlderMessages,
    loadNewerMessages,
    resetToLive,
    addReaction,
    removeReaction,
    pinMessage,
    unpinMessage,
    setTyping,
    markRead,
    uploadAttachment,
  };
}
