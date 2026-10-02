import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatSocket } from './useChatSocket';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { queryKeys } from '@/shared/api/queryKeys';
import { chatApi } from '../api/chatApi';
import { emitWithAck } from './socketAck';
import { updateCachedPages, dedupeMessages, applyReactionMessage } from './chatCacheSync';
import { nextMessageStatus } from './messageStatus';
import {
  decryptMessageForDisplay,
  encryptMessageForPeer,
  ensureMessageIdentityRegistered,
  resolveDirectPeerUserId,
  type ConversationPeerView,
} from '../lib/e2ee/messageE2ee';
import { nextMessageSeq } from '../lib/e2ee/replayStore';
import { cacheDecryptedBody } from './useDecryptedMessageBody';
import { e2eeManager, parseEnvelope } from '@/shared/lib/crypto/e2ee';
import {
  AttachmentView,
  ConversationView,
  InfiniteMessagesData,
  MessageView,
  OutgoingAttachment,
  PaginatedMessages,
} from '../../../entities/chat/model/types';
import { mutationOutbox, mutationOutboxDb } from '@/shared/lib/outbox/mutationOutbox';

const clientSeqMap = new Map<string, number>();

function getNextClientSeq(convId: string): number {
  const current = (clientSeqMap.get(convId) ?? 0) | 0;
  const next = (current + 1) | 0;
  clientSeqMap.set(convId, next);
  return next;
}

export function useMessageActions(conversationId: string | null) {
  const socket = useChatSocket();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  const updatePages = useCallback(
    (updater: (pages: PaginatedMessages[]) => PaginatedMessages[]) => {
      if (!conversationId) return;
      updateCachedPages(queryClient, conversationId, updater);
    },
    [conversationId, queryClient],
  );

  // Message-layer E2EE: publish our message-slot identity so 1:1 peers can
  // encrypt to us. Idempotent per session; failure only means we stay plaintext.
  useEffect(() => {
    if (conversationId) void ensureMessageIdentityRegistered();
  }, [conversationId]);

  // Outbox Dispatcher: Flushes queued offline mutations when back online
  useEffect(() => {
    mutationOutbox.setDispatcher(async (mutation) => {
      const p = mutation.payload;
      try {
        if (socket && socket.connected) {
          const res = await emitWithAck<MessageView>(socket, 'sendMessage', {
            conversationId: p.conversationId,
            text: p.text,
            replyToId: p.replyToId,
            attachments: p.attachments,
            clientMessageId: mutation.id,
            clientSeq: p.clientSeq,
          });
          if (res.message || res.status === 'ok') {
            return true;
          }
        }
        const fallbackRes = await chatApi.sendMessage(p.conversationId, {
          text: p.text,
          replyToId: p.replyToId,
          attachments: p.attachments as OutgoingAttachment[] | undefined,
          clientMessageId: mutation.id,
          clientSeq: p.clientSeq,
        });
        return Boolean(fallbackRes);
      } catch {
        return false;
      }
    });

    const unsubscribe = mutationOutbox.onMutationSent((mutation) => {
      updatePages((pages) =>
        pages.map((p) => ({
          ...p,
          data: p.data.map((m) =>
            m.id === mutation.id || m.clientMessageId === mutation.id
              ? { ...m, status: 'SENT' as const }
              : m,
          ),
        })),
      );
    });

    return () => {
      unsubscribe();
    };
  }, [socket, updatePages]);

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
    async (
      text: string,
      replyToId?: string,
      attachments?: OutgoingAttachment[],
      opts?: { encrypt?: boolean },
    ) => {
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

      const clientSeq = getNextClientSeq(conversationId);
      const optimisticId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const optimisticMessage: MessageView = {
        id: optimisticId,
        tempId: optimisticId,
        clientMessageId: optimisticId,
        clientSeq: clientSeq | 0,
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
          size: a.size != null ? a.size | 0 : null,
          width: a.width != null ? a.width | 0 : null,
          height: a.height != null ? a.height | 0 : null,
          duration: a.duration != null ? a.duration | 0 : null,
          waveform: a.waveform,
          isSpoiler: Boolean(a.isSpoiler),
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

      // Standard direct messaging sends clean plaintext/emojis directly (Telegram-style cloud chat).
      // Only encrypt if explicitly opted-in via opts.encrypt.
      let outgoingText = text;
      if (opts?.encrypt && text.trim() && userId) {
        const peerId = resolveDirectPeerUserId(
          queryClient.getQueryData<ConversationPeerView[]>(queryKeys.conversations.root),
          conversationId,
          userId,
        );
        if (peerId) {
          const encrypted = await encryptMessageForPeer(text, peerId, {
            conversationId,
            senderId: userId,
            seq: nextMessageSeq(conversationId),
          });
          if (encrypted) {
            outgoingText = encrypted;
            cacheDecryptedBody(encrypted, text);
          }
        }
      }

      // Persist mutation into IndexedDB outbox queue (offline backup, do NOT autoFlush during active send)
      await mutationOutbox
        .enqueueMessage(
          optimisticId,
          {
            conversationId,
            text: outgoingText,
            replyToId,
            attachments: attachments as unknown[],
            clientSeq,
          },
          false,
        )
        .catch(() => {});

      // Lifecycle: optimistic row is `pending` (SENDING). WS ack advances it
      // to `sent`; delivery/read receipts arrive later via realtime events.
      // Timeout now REJECTS (see socketAck) so we always fall through to the
      // REST fallback instead of stranding the row in `pending`.
      try {
        const res = await emitWithAck<MessageView>(socket, 'sendMessage', {
          conversationId,
          text: outgoingText || undefined,
          messageType: resolvedMessageType,
          replyToId,
          attachments,
          clientMessageId: optimisticId,
          clientSeq,
        });
        if (res.message) {
          void mutationOutboxDb.delete(optimisticId);
          const real = {
            ...res.message,
            tempId: optimisticId,
            clientMessageId: optimisticId,
            status: nextMessageStatus(res.message.status, 'sent'),
          } as MessageView;
          updatePages((pages) =>
            pages.map((p) => ({
              ...p,
              data: dedupeMessages(
                p.data.map((m) =>
                  m.id === optimisticId ||
                  m.tempId === optimisticId ||
                  m.clientMessageId === optimisticId ||
                  m.id === real.id
                    ? real
                    : m,
                ),
              ),
            })),
          );
        } else {
          // Ack without echo: server accepted, echo arrives via `newMessage`.
          void mutationOutboxDb.delete(optimisticId);
          updatePages((pages) =>
            pages.map((p) => ({
              ...p,
              data: p.data.map((m) =>
                m.id === optimisticId || m.tempId === optimisticId
                  ? { ...m, status: nextMessageStatus(m.status, 'sent') as MessageView['status'] }
                  : m,
              ),
            })),
          );
        }
      } catch (err) {
        try {
          const fallbackRes = await chatApi.sendMessage(conversationId, {
            text: outgoingText || undefined,
            messageType: resolvedMessageType,
            replyToId,
            attachments,
            clientMessageId: optimisticId,
            clientSeq,
          });
          if (fallbackRes) {
            void mutationOutboxDb.delete(optimisticId);
            const real = {
              ...(fallbackRes as MessageView),
              tempId: optimisticId,
              clientMessageId: optimisticId,
              status: 'SENT' as const,
            };
            updatePages((pages) =>
              pages.map((p) => ({
                ...p,
                data: dedupeMessages(
                  p.data.map((m) =>
                    m.id === optimisticId ||
                    m.tempId === optimisticId ||
                    m.clientMessageId === optimisticId ||
                    m.id === real.id
                      ? real
                      : m,
                  ),
                ),
              })),
            );
            return;
          }
        } catch {
          // both socket and http failed
        }

        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (isOffline) {
          // Telegram UX: Retain optimistic SENDING status with clock icon.
          // Outbox engine will automatically flush when back online.
          return;
        }

        await mutationOutboxDb.updateStatus(optimisticId, 'failed', String(err)).catch(() => {});
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
    [conversationId, socket, updatePages, userId, queryClient],
  );

  const retrySendMessage = useCallback(
    async (failedMessageId: string) => {
      if (!conversationId) return;
      const data = queryClient.getQueryData<InfiniteMessagesData>(
        queryKeys.conversations.messages(conversationId),
      );
      const targetMessage = data?.pages
        .flatMap((p) => p.data)
        .find(
          (m) =>
            m.id === failedMessageId ||
            m.tempId === failedMessageId ||
            m.clientMessageId === failedMessageId,
        );

      if (!targetMessage) return;

      const optimisticId = targetMessage.clientMessageId || targetMessage.id;
      // Preserve the original clientSeq for idempotent dedupe; mint a fresh
      // one only when the failed row never had it (legacy rows).
      const retryClientSeq = targetMessage.clientSeq ?? getNextClientSeq(conversationId);
      const text = targetMessage.body || '';
      const replyToId = targetMessage.replyTo?.id;

      // If an attachment previously failed with a data: URI, re-upload it properly to server now
      const resolvedAttachments: OutgoingAttachment[] = [];
      for (const a of targetMessage.attachments || []) {
        if (a.url && a.url.startsWith('data:')) {
          try {
            const res = await fetch(a.url);
            const blob = await res.blob();
            const file = new File([blob], a.fileName || 'attachment.gif', {
              type: a.mimeType || blob.type || 'image/gif',
            });
            const uploaded = await uploadAttachment(file);
            resolvedAttachments.push({
              ...uploaded,
              isSpoiler: a.isSpoiler,
            });
            continue;
          } catch (e) {
            console.error('Failed to re-upload attachment on retry:', e);
          }
        }
        resolvedAttachments.push({
          type: a.type,
          url: a.url,
          fileName: a.fileName || undefined,
          mimeType: a.mimeType || undefined,
          size: a.size ?? undefined,
          width: a.width ?? undefined,
          height: a.height ?? undefined,
          duration: a.duration ?? undefined,
          waveform: a.waveform ?? undefined,
          isSpoiler: a.isSpoiler ?? undefined,
          thumbnailUrl: a.thumbnailUrl || undefined,
        });
      }

      updatePages((pages) =>
        pages.map((p) => ({
          ...p,
          data: p.data.map((m) =>
            m.id === failedMessageId || m.tempId === failedMessageId
              ? {
                  ...m,
                  status: 'SENDING' as const,
                  attachments: (resolvedAttachments.length > 0
                    ? resolvedAttachments
                    : m.attachments) as AttachmentView[],
                }
              : m,
          ),
        })),
      );

      // Retry sends plain text directly.
      const outgoingText = text;

      try {
        const res = await emitWithAck<MessageView>(socket, 'sendMessage', {
          conversationId,
          text: outgoingText || undefined,
          messageType: targetMessage.messageType,
          replyToId,
          attachments: resolvedAttachments.length > 0 ? resolvedAttachments : undefined,
          clientMessageId: optimisticId,
          clientSeq: retryClientSeq,
        });
        if (res.message) {
          const real = {
            ...res.message,
            status: nextMessageStatus(res.message.status, 'sent'),
          } as MessageView;
          updatePages((pages) =>
            pages.map((p) => ({
              ...p,
              data: p.data.map((m) =>
                m.id === optimisticId || m.tempId === optimisticId || m.id === failedMessageId
                  ? real
                  : m,
              ),
            })),
          );
        }
      } catch (err) {
        try {
          const fallbackRes = await chatApi.sendMessage(conversationId, {
            text: outgoingText || undefined,
            messageType: targetMessage.messageType,
            replyToId,
            attachments: resolvedAttachments.length > 0 ? resolvedAttachments : undefined,
            clientMessageId: optimisticId,
          });
          if (fallbackRes) {
            const real = { ...(fallbackRes as MessageView), status: 'SENT' as const };
            updatePages((pages) =>
              pages.map((p) => ({
                ...p,
                data: p.data.map((m) =>
                  m.id === optimisticId || m.tempId === optimisticId || m.id === failedMessageId
                    ? real
                    : m,
                ),
              })),
            );
            return;
          }
        } catch {
          // fallback failed
        }
        updatePages((pages) =>
          pages.map((p) => ({
            ...p,
            data: p.data.map((m) =>
              m.id === failedMessageId || m.tempId === failedMessageId
                ? { ...m, status: 'ERROR' as const }
                : m,
            ),
          })),
        );
        throw err;
      }
    },
    [conversationId, queryClient, socket, updatePages, userId],
  );

  const editMessage = useCallback(
    async (
      messageId: string,
      body: string,
      originalBody?: string | null,
      newAttachment?: AttachmentView | null,
    ) => {
      let outgoing = body;
      if (originalBody && conversationId && userId && e2eeManager.isEncrypted(originalBody)) {
        try {
          const peerId = resolveDirectPeerUserId(
            queryClient.getQueryData<ConversationPeerView[]>(queryKeys.conversations.root),
            conversationId,
            userId,
          );
          if (peerId) {
            let seq: number | null = null;
            try {
              const original = parseEnvelope(originalBody);
              if (original.v !== 1) {
                if (original.aad.conversationId === conversationId) {
                  seq = original.aad.seq;
                }
              }
            } catch {
              // Unparseable
            }
            const encrypted = await encryptMessageForPeer(body, peerId, {
              conversationId,
              senderId: userId,
              seq: seq ?? nextMessageSeq(conversationId),
            });
            if (encrypted) outgoing = encrypted;
          }
        } catch {
          outgoing = body;
        }
      }
      updatePages((pages) =>
        pages.map((p) => ({
          ...p,
          data: p.data.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  body: outgoing,
                  attachments: newAttachment ? [newAttachment] : m.attachments,
                  isEdited: true,
                  editedAt: new Date().toISOString(),
                }
              : m,
          ),
        })),
      );
      return emitWithAck(socket, 'editMessage', {
        messageId,
        body: outgoing,
        ...(newAttachment ? { attachments: [newAttachment] } : {}),
      });
    },
    [socket, conversationId, queryClient, userId, updatePages],
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
    async (
      message: {
        id: string;
        body: string | null;
        conversationId: string;
        sender?: { id?: string | null } | null;
        attachments?: any[];
      },
      conversationIds: string[],
      opts?: { hideAuthor?: boolean },
    ) => {
      const targets = [...new Set(conversationIds.filter(Boolean))];
      if (targets.length === 0) return [];
      if (!message.body || !e2eeManager.isEncrypted(message.body)) {
        // Plaintext (or bodiless): legacy server-side copy preserves
        // attribution behavior exactly as before.
        return emitWithAck(socket, 'forwardMessage', {
          messageId: message.id,
          conversationIds: targets,
          hideAuthor: opts?.hideAuthor,
        });
      }
      // Envelope: a server-side copy would plant permanently undecryptable
      // ciphertext in the target dialog. Decrypt with the SOURCE peer, then
      // re-encrypt per TARGET (explicit user-chosen targets without E2EE go
      // plaintext — same rule as the send path).
      const conversations = queryClient.getQueryData<ConversationPeerView[]>(
        queryKeys.conversations.root,
      );
      const sourcePeer = resolveDirectPeerUserId(conversations, message.conversationId, userId);
      const plain = await decryptMessageForDisplay(message.body, {
        peerUserId: sourcePeer,
        conversationId: message.conversationId,
        senderId: message.sender?.id ?? null,
      });
      if (plain.status !== 'decrypted') {
        throw new Error('Cannot forward a message this device cannot decrypt');
      }
      const results: unknown[] = [];
      for (const targetId of targets) {
        let outgoing = plain.text;
        const targetPeer = resolveDirectPeerUserId(conversations, targetId, userId);
        if (targetPeer && userId) {
          const encrypted = await encryptMessageForPeer(plain.text, targetPeer, {
            conversationId: targetId,
            senderId: userId,
            seq: nextMessageSeq(targetId),
          });
          if (encrypted) outgoing = encrypted;
        }
        const res = await emitWithAck(socket, 'sendMessage', {
          conversationId: targetId,
          text: outgoing,
          messageType: 'TEXT',
          forwardedFromId: opts?.hideAuthor ? undefined : message.id,
          clientMessageId: `fwd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          clientSeq: getNextClientSeq(targetId),
        });
        results.push(res);
      }
      return results;
    },
    [socket, queryClient, userId],
  );

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const currentUserId = useAuthStore.getState().userId;
      const userProfile = currentUserId
        ? queryClient.getQueryData<{
            username?: string;
            displayName?: string | null;
            avatar?: string | null;
          }>(queryKeys.user.current(currentUserId))
        : null;
      const currentUserSnapshot = {
        id: currentUserId || 'me',
        username: userProfile?.username || '',
        displayName: userProfile?.displayName || userProfile?.username || null,
        avatar: userProfile?.avatar || null,
      };

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
                    ? [...(prev.users || []), currentUserSnapshot]
                    : prev.users || [],
              };
            } else {
              nextReactions.push({
                emoji,
                count: 1,
                selfReacted: true,
                users: currentUserId ? [currentUserSnapshot] : [],
              });
            }

            return { ...m, reactions: nextReactions };
          }),
        })),
      );

      try {
        let applied = false;
        if (socket && socket.connected) {
          try {
            const res = await emitWithAck<{ message?: MessageView }>(socket, 'addReaction', {
              messageId,
              emoji,
            });
            if (res?.message && conversationId) {
              applyReactionMessage(
                queryClient,
                conversationId,
                res.message as MessageView,
                currentUserId,
              );
              applied = true;
            } else if (res?.status === 'ok') {
              applied = true;
            }
          } catch (sockErr) {
            console.warn('Socket addReaction failed, attempting REST fallback:', sockErr);
          }
        }
        if (!applied && conversationId) {
          const updated = await chatApi.addReaction(conversationId, messageId, emoji);
          if (updated) {
            applyReactionMessage(queryClient, conversationId, updated, currentUserId);
          }
        }
      } catch (err) {
        console.error('Failed to add reaction:', err);
      }
    },
    [socket, updatePages, conversationId, queryClient],
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
        let applied = false;
        if (socket && socket.connected) {
          try {
            const res = await emitWithAck<{ message?: MessageView }>(socket, 'removeReaction', {
              messageId,
              emoji,
            });
            if (res?.message && conversationId) {
              applyReactionMessage(
                queryClient,
                conversationId,
                res.message as MessageView,
                currentUserId,
              );
              applied = true;
            } else if (res?.status === 'ok') {
              applied = true;
            }
          } catch (sockErr) {
            console.warn('Socket removeReaction failed, attempting REST fallback:', sockErr);
          }
        }
        if (!applied && conversationId) {
          const updated = await chatApi.removeReaction(conversationId, messageId, emoji);
          if (updated) {
            applyReactionMessage(queryClient, conversationId, updated, currentUserId);
          }
        }
      } catch (err) {
        console.error('Failed to remove reaction:', err);
      }
    },
    [socket, updatePages, conversationId, queryClient],
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
          queryKeys.conversations.root,
          (prev: ConversationView[] | undefined) =>
            prev?.map((conversation: ConversationView) =>
              conversation.id === conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation,
            ),
        );
        socket.emit('markRead', { conversationId, messageId: lastReadMessageId });
        chatApi.markRead?.(conversationId)?.catch?.(() => {});
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
      // Envelopes must never take the server batch path (it copies bodies
      // verbatim): fan out client-side per message when any id is encrypted.
      const data = queryClient.getQueryData<InfiniteMessagesData>(
        queryKeys.conversations.messages(conversationId),
      );
      const byId = new Map(
        (data?.pages ?? []).flatMap((p) => p.data).map((m) => [m.id, m] as const),
      );
      const isEnvelopeId = (id: string) => {
        const body = byId.get(id)?.body;
        return !!body && e2eeManager.isEncrypted(body);
      };
      // Split: plaintext keeps the single server batch; envelopes fan out
      // client-side per message (decrypt source → re-encrypt per target).
      const envelopeIds = messageIds.filter(isEnvelopeId);
      const plainIds = messageIds.filter((id) => !isEnvelopeId(id));
      const results: unknown[] = [];
      if (plainIds.length > 0) {
        results.push(
          await chatApi.batchForwardMessages(conversationId, plainIds, conversationIds, hideAuthor),
        );
      }
      for (const id of envelopeIds) {
        const msg = byId.get(id);
        if (!msg) continue;
        results.push(await forwardMessage(msg, conversationIds, { hideAuthor }));
      }
      return results;
    },
    [conversationId, queryClient, forwardMessage],
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
      queryKey: queryKeys.conversations.messages(conversationId),
    });
  }, [conversationId, queryClient]);

  return {
    sendMessage,
    retrySendMessage,
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
