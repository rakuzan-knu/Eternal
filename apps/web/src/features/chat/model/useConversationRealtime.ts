import { updateConversationLists } from './chatCacheSync';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatSocket } from './useChatSocket';
import { useChatSocketEvent } from './useChatSocketEvent';
import { queryKeys } from '@/shared/api/queryKeys';
import {
  applyConversationPatch,
  applyIncomingMessage,
  applyMessageEdited,
  applyMessageDeleted,
  applyMessageDelivered,
  applyMessageRead,
  applyMessagesCleared,
  applyConversationDeleted,
  applyReactionMessage,
  mapCachedMessages,
  updateCachedMessageCopies,
  getCachedMessageCopies,
} from './chatCacheSync';
import type { ConversationView, MessageView } from '../../../entities/chat/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { ensureMessageIdentityRegistered } from '../lib/e2ee/messageE2ee';
import { getRealtimeChatBatch, type ChatCacheClient } from './realtimeChatBatch';
import { createSocketStateBatch } from './socketStateBatch';
import { registerSessionResetHandler } from '@/shared/model/resetSession';

/**
 * Per-conversation realtime binding (Socket.io → TanStack Query cache).
 *
 * - Joins the conversation room on mount / id change.
 * - Applies every WS event via `chatCacheSync` (`setQueryData`, no REST).
 * - Delivery lifecycle: own echo → SENT, peer events → DELIVERED → READ
 *   (see `messageStatus` forward-only machine).
 * - REST gap-fill on reconnect is owned by `useChatGapFill`; this hook only
 *   keeps the live tail consistent.
 */
export function useConversationRealtime(conversationId: string | null) {
  const socket = useChatSocket();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const cacheBatch = useMemo(
    () => getRealtimeChatBatch(queryClient, userId),
    [queryClient, userId],
  );
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const typingTimerRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const typingBatchRef = useRef<ReturnType<
    typeof createSocketStateBatch<{ userId: string; isTyping: boolean }>
  > | null>(null);

  useEffect(() => {
    const batch = createSocketStateBatch<{ userId: string; isTyping: boolean }>((updates) => {
      for (const update of updates.values()) {
        if (!update.isTyping) continue;
        const timer = setTimeout(() => {
          setTypingUserIds((prev) => {
            if (!prev.has(update.userId)) return prev;
            const next = new Set(prev);
            next.delete(update.userId);
            return next;
          });
          typingTimerRef.current.delete(update.userId);
        }, 3500);
        typingTimerRef.current.set(update.userId, timer);
      }
      setTypingUserIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const update of updates.values()) {
          if (next.has(update.userId) === update.isTyping) continue;
          changed = true;
          if (update.isTyping) next.add(update.userId);
          else next.delete(update.userId);
        }
        return changed ? next : prev;
      });
    });
    typingBatchRef.current = batch;
    const unregisterReset = registerSessionResetHandler(() => {
      batch.dispose();
      typingTimerRef.current.forEach((timer) => clearTimeout(timer));
      typingTimerRef.current.clear();
      setTypingUserIds(new Set());
    });
    socket.on('disconnect', batch.flush);
    return () => {
      unregisterReset();
      socket.off('disconnect', batch.flush);
      batch.dispose();
      typingBatchRef.current = null;
    };
  }, [conversationId, socket, userId]);

  useEffect(() => {
    const release = cacheBatch.retain();
    const flush = () => cacheBatch.flush();
    socket.on('disconnect', flush);
    socket.on('connect', flush);
    return () => {
      socket.off('disconnect', flush);
      socket.off('connect', flush);
      if (useAuthStore.getState().userId !== userId) cacheBatch.cancel();
      release();
    };
  }, [cacheBatch, socket, userId]);

  // Bootstrap E2EE message identity on mount
  useEffect(() => {
    void ensureMessageIdentityRegistered();
  }, []);

  // Reset typing indicators when switching conversations (effect, not render).
  useEffect(() => {
    setTypingUserIds(new Set());
    typingTimerRef.current.forEach((t) => clearTimeout(t));
    typingTimerRef.current.clear();
  }, [conversationId]);

  // Clear typing timers on unmount (prevents setState-after-unmount + leaks).
  useEffect(() => {
    const timers = typingTimerRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    socket.emit('joinConversation', { conversationId });
    // Rooms are server-side: re-join after every reconnect, otherwise the
    // thread silently stops receiving events until remount.
    const rejoin = () => {
      socket.emit('joinConversation', { conversationId });
    };
    socket.on('connect', rejoin);
    return () => {
      socket.off('connect', rejoin);
    };
  }, [conversationId, socket]);

  const findLoadedMessage = (
    cache: ChatCacheClient,
    messageId: string,
  ): MessageView | undefined => {
    if (!conversationId) return undefined;
    return getCachedMessageCopies(cache, conversationId)
      .flatMap((p) => p.data)
      .find((m) => m.id === messageId);
  };

  const syncConversationPinned = (
    cache: ChatCacheClient,
    updater: (pinned: MessageView[]) => MessageView[],
  ) => {
    updateConversationLists(cache, (prev: ConversationView[] | undefined) =>
      prev?.map((c: ConversationView) =>
        c.id === conversationId ? { ...c, pinnedMessages: updater(c.pinnedMessages) } : c,
      ),
    );
  };

  useChatSocketEvent<{ conversationId: string; message: MessageView; clientMessageId?: string }>(
    'newMessage',
    (payload) => {
      if (payload.conversationId !== conversationId || !conversationId) return;
      const isOwn = Boolean(
        payload.message.sender?.id && userId && payload.message.sender.id === userId,
      );
      const messageToApply =
        payload.clientMessageId && !payload.message.clientMessageId
          ? { ...payload.message, clientMessageId: payload.clientMessageId }
          : payload.message;
      cacheBatch.enqueue((cache) =>
        applyIncomingMessage(cache, conversationId, messageToApply, {
          status: isOwn ? 'sent' : 'sent',
        }),
      );
      if (!isOwn) {
        socket.emit('messageDelivered', { conversationId, messageId: payload.message.id });
        socket.emit('markRead', { conversationId });
      }
    },
  );

  useChatSocketEvent<{ conversationId: string; messageId: string; deliveredToUserId: string }>(
    'messageDelivered',
    (payload) => {
      if (payload.conversationId !== conversationId || !conversationId) return;
      cacheBatch.enqueue((cache) =>
        applyMessageDelivered(cache, conversationId, payload.messageId),
      );
    },
  );

  useChatSocketEvent<{ conversationId: string; message: MessageView }>(
    'messageEdited',
    (payload) => {
      if (payload.conversationId !== conversationId || !conversationId) return;
      cacheBatch.enqueue((cache) => applyMessageEdited(cache, conversationId, payload.message));
    },
  );

  useChatSocketEvent<{ conversationId: string; messageId: string }>('messageDeleted', (payload) => {
    if (payload.conversationId !== conversationId || !conversationId) return;
    cacheBatch.enqueue((cache) => applyMessageDeleted(cache, conversationId, payload.messageId));
  });

  useChatSocketEvent<{ conversationId: string }>('messagesCleared', (payload) => {
    if (payload.conversationId !== conversationId || !conversationId) return;
    cacheBatch.enqueue((cache) => applyMessagesCleared(cache, conversationId));
  });

  useChatSocketEvent<{ conversationId: string }>('conversationDeleted', (payload) => {
    if (payload.conversationId !== conversationId || !conversationId) return;
    cacheBatch.enqueue((cache) => applyConversationDeleted(cache, conversationId));
  });

  const handleReaction = (payload: { conversationId: string; message: MessageView }) => {
    if (payload.conversationId !== conversationId || !conversationId) return;
    cacheBatch.enqueue((cache) =>
      applyReactionMessage(cache, conversationId, payload.message, userId),
    );
  };

  useChatSocketEvent<{ conversationId: string; message: MessageView }>(
    'messageReactionAdded',
    handleReaction,
  );
  useChatSocketEvent<{ conversationId: string; message: MessageView }>(
    'messageReactionRemoved',
    handleReaction,
  );

  useChatSocketEvent<{ conversationId: string; messageId: string }>('messagePinned', (p) => {
    if (p.conversationId !== conversationId || !conversationId) return;
    cacheBatch.enqueue((cache) => {
      updateCachedMessageCopies(cache, conversationId, (pages) =>
        mapCachedMessages(pages, (m) => (m.id === p.messageId ? { ...m, isPinned: true } : m)),
      );

      const message = findLoadedMessage(cache, p.messageId);
      if (message) {
        syncConversationPinned(cache, (pinned) => [
          ...pinned.filter((m) => m.id !== p.messageId),
          { ...message, isPinned: true },
        ]);
      }
    });
  });

  useChatSocketEvent<{ conversationId: string; messageId: string }>('messageUnpinned', (p) => {
    if (p.conversationId !== conversationId || !conversationId) return;
    cacheBatch.enqueue((cache) => {
      updateCachedMessageCopies(cache, conversationId, (pages) =>
        mapCachedMessages(pages, (m) => (m.id === p.messageId ? { ...m, isPinned: false } : m)),
      );
      syncConversationPinned(cache, (pinned) => pinned.filter((m) => m.id !== p.messageId));
    });
  });

  useChatSocketEvent<{
    conversationId: string;
    userId: string;
    messageId?: string | null;
    readAt: string;
  }>('messageRead', (payload) => {
    if (payload.conversationId !== conversationId || !conversationId) return;
    cacheBatch.enqueue((cache) =>
      applyMessageRead(cache, conversationId, {
        userId: payload.userId,
        messageId: payload.messageId,
        readAt: payload.readAt,
      }),
    );
  });

  useChatSocketEvent<{ conversationId: string; userId: string; isTyping: boolean }>(
    'typing',
    (payload) => {
      if (payload.conversationId !== conversationId || payload.userId === userId) return;

      const existing = typingTimerRef.current.get(payload.userId);
      if (existing) {
        clearTimeout(existing);
        typingTimerRef.current.delete(payload.userId);
      }

      typingBatchRef.current?.enqueue(payload.userId, () => payload);
    },
  );

  useChatSocketEvent<{
    conversationId: string;
    sharedTheme: string;
    sharedThemeUpdatedAt: string;
  }>('conversationSharedThemeUpdated', (payload) => {
    if (payload.conversationId !== conversationId) return;
    cacheBatch.enqueue((cache) =>
      applyConversationPatch(cache, {
        id: payload.conversationId,
        sharedTheme: payload.sharedTheme,
        sharedThemeUpdatedAt: payload.sharedThemeUpdatedAt,
      } as Partial<ConversationView> & { id: string }),
    );
  });

  useChatSocketEvent<{
    conversationId: string;
  }>('conversationSharedThemeUnlinked', (payload) => {
    if (payload.conversationId !== conversationId) return;
    cacheBatch.enqueue((cache) =>
      applyConversationPatch(cache, {
        id: payload.conversationId,
        sharedTheme: null,
        sharedThemeUpdatedAt: null,
      } as unknown as Partial<ConversationView> & { id: string }),
    );
  });

  return { typingUserIds };
}
