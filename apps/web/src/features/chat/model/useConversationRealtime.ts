import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatSocket } from './useChatSocket';
import { useChatSocketEvent } from './useChatSocketEvent';
import { queryKeys } from '@/shared/api/queryKeys';
import {
  applyConversationPatch,
  applyIncomingMessage,
  applyMessageDelivered,
  applyMessageRead,
  applyMessagesCleared,
  applyConversationDeleted,
  applyReactionMessage,
  mapCachedMessages,
  updateCachedPages,
} from './chatCacheSync';
import type { ConversationView, MessageView } from '../../../entities/chat/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';

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
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const typingTimerRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

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

  const findLoadedMessage = (messageId: string): MessageView | undefined => {
    if (!conversationId) return undefined;
    const data = queryClient.getQueryData<{ pages: { data: MessageView[] }[] }>(
      queryKeys.conversations.messages(conversationId),
    );
    return data?.pages.flatMap((p) => p.data).find((m) => m.id === messageId);
  };

  const syncConversationPinned = (updater: (pinned: MessageView[]) => MessageView[]) => {
    queryClient.setQueryData<ConversationView[]>(
      queryKeys.conversations.root,
      (prev: ConversationView[] | undefined) =>
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
      applyIncomingMessage(queryClient, conversationId, messageToApply, {
        status: isOwn ? 'sent' : 'sent',
      });
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
      applyMessageDelivered(queryClient, conversationId, payload.messageId);
    },
  );

  useChatSocketEvent<{ conversationId: string; message: MessageView }>(
    'messageEdited',
    (payload) => {
      if (payload.conversationId !== conversationId || !conversationId) return;
      updateCachedPages(queryClient, conversationId, (pages) =>
        mapCachedMessages(pages, (m) => (m.id === payload.message.id ? payload.message : m)),
      );
    },
  );

  useChatSocketEvent<{ conversationId: string; messageId: string }>('messageDeleted', (payload) => {
    if (payload.conversationId !== conversationId || !conversationId) return;
    updateCachedPages(queryClient, conversationId, (pages) =>
      mapCachedMessages(pages, (m) =>
        m.id === payload.messageId ? { ...m, isDeleted: true, body: null } : m,
      ),
    );
  });

  useChatSocketEvent<{ conversationId: string }>('messagesCleared', (payload) => {
    if (payload.conversationId !== conversationId || !conversationId) return;
    applyMessagesCleared(queryClient, conversationId);
  });

  useChatSocketEvent<{ conversationId: string }>('conversationDeleted', (payload) => {
    if (payload.conversationId !== conversationId || !conversationId) return;
    applyConversationDeleted(queryClient, conversationId);
  });

  const handleReaction = (payload: { conversationId: string; message: MessageView }) => {
    if (payload.conversationId !== conversationId || !conversationId) return;
    applyReactionMessage(queryClient, conversationId, payload.message, userId);
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
    updateCachedPages(queryClient, conversationId, (pages) =>
      mapCachedMessages(pages, (m) => (m.id === p.messageId ? { ...m, isPinned: true } : m)),
    );

    const message = findLoadedMessage(p.messageId);
    if (message) {
      syncConversationPinned((pinned) => [
        ...pinned.filter((m) => m.id !== p.messageId),
        { ...message, isPinned: true },
      ]);
    }
  });

  useChatSocketEvent<{ conversationId: string; messageId: string }>('messageUnpinned', (p) => {
    if (p.conversationId !== conversationId || !conversationId) return;
    updateCachedPages(queryClient, conversationId, (pages) =>
      mapCachedMessages(pages, (m) => (m.id === p.messageId ? { ...m, isPinned: false } : m)),
    );
    syncConversationPinned((pinned) => pinned.filter((m) => m.id !== p.messageId));
  });

  useChatSocketEvent<{
    conversationId: string;
    userId: string;
    messageId?: string | null;
    readAt: string;
  }>('messageRead', (payload) => {
    if (payload.conversationId !== conversationId || !conversationId) return;
    applyMessageRead(queryClient, conversationId, {
      userId: payload.userId,
      messageId: payload.messageId,
      readAt: payload.readAt,
    });
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

      setTypingUserIds((prev) => {
        const next = new Set(prev);
        if (payload.isTyping) {
          next.add(payload.userId);
        } else {
          next.delete(payload.userId);
        }
        return next;
      });

      if (payload.isTyping) {
        const timer = setTimeout(() => {
          setTypingUserIds((prev) => {
            const next = new Set(prev);
            next.delete(payload.userId);
            return next;
          });
          typingTimerRef.current.delete(payload.userId);
        }, 3500);
        typingTimerRef.current.set(payload.userId, timer);
      }
    },
  );

  useChatSocketEvent<{
    conversationId: string;
    sharedTheme: string;
    sharedThemeUpdatedAt: string;
  }>('conversationSharedThemeUpdated', (payload) => {
    if (payload.conversationId !== conversationId) return;
    applyConversationPatch(queryClient, {
      id: payload.conversationId,
      sharedTheme: payload.sharedTheme,
      sharedThemeUpdatedAt: payload.sharedThemeUpdatedAt,
    } as Partial<ConversationView> & { id: string });
  });

  useChatSocketEvent<{
    conversationId: string;
  }>('conversationSharedThemeUnlinked', (payload) => {
    if (payload.conversationId !== conversationId) return;
    applyConversationPatch(queryClient, {
      id: payload.conversationId,
      sharedTheme: null,
      sharedThemeUpdatedAt: null,
    } as unknown as Partial<ConversationView> & { id: string });
  });

  return { typingUserIds };
}
