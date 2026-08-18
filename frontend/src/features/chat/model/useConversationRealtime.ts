import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatSocket } from './useChatSocket';
import { useChatSocketEvent } from './useChatSocketEvent';
import { CONVERSATION_MESSAGES_KEY, CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import {
  ConversationView,
  InfiniteMessagesData,
  MessageView,
  PaginatedMessages,
} from '../../../entities/chat/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useConversationRealtime(conversationId: string | null) {
  const socket = useChatSocket();
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());

  const [typingResetKey, setTypingResetKey] = useState(conversationId);
  if (conversationId !== typingResetKey) {
    setTypingResetKey(conversationId);
    setTypingUserIds(new Set());
  }

  useEffect(() => {
    if (!conversationId) return;
    socket.emit('joinConversation', { conversationId });
  }, [conversationId, socket]);

  const updatePages = (updater: (pages: PaginatedMessages[]) => PaginatedMessages[]) => {
    if (!conversationId) return;
    queryClient.setQueryData<InfiniteMessagesData>(
      [CONVERSATION_MESSAGES_KEY, conversationId],
      (prev: InfiniteMessagesData | undefined) =>
        prev ? { ...prev, pages: updater(prev.pages) } : prev,
    );
  };

  const mapMessages = (pages: PaginatedMessages[], fn: (m: MessageView) => MessageView) =>
    pages.map((p) => ({ ...p, data: p.data.map(fn) }));

  const findLoadedMessage = (messageId: string): MessageView | undefined => {
    if (!conversationId) return undefined;
    const data = queryClient.getQueryData<InfiniteMessagesData>([
      CONVERSATION_MESSAGES_KEY,
      conversationId,
    ]);
    return data?.pages.flatMap((p) => p.data).find((m) => m.id === messageId);
  };

  const syncConversationPinned = (updater: (pinned: MessageView[]) => MessageView[]) => {
    queryClient.setQueryData<ConversationView[]>(
      [CONVERSATIONS_KEY],
      (prev: ConversationView[] | undefined) =>
        prev?.map((c: ConversationView) =>
          c.id === conversationId ? { ...c, pinnedMessages: updater(c.pinnedMessages) } : c,
        ),
    );
  };

  useChatSocketEvent<{ conversationId: string; message: MessageView; clientMessageId?: string }>(
    'newMessage',
    (payload) => {
      if (payload.conversationId !== conversationId) return;
      updatePages((pages) => {
        const clientMid = payload.clientMessageId;
        const exists = pages.some((p) =>
          p.data.some(
            (m) =>
              m.id === payload.message.id ||
              (clientMid && (m.id === clientMid || m.tempId === clientMid)),
          ),
        );

        if (exists) {
          return pages.map((p) => ({
            ...p,
            data: p.data.map((m) =>
              m.id === payload.message.id ||
              (clientMid && (m.id === clientMid || m.tempId === clientMid))
                ? { ...payload.message, status: 'SENT' as const }
                : m,
            ),
          }));
        }

        if (pages.length === 0)
          return [{ data: [payload.message], hasMore: false, nextCursor: null }];
        const next = [...pages];
        next[0] = { ...next[0], data: [payload.message, ...next[0].data] };
        return next;
      });
      if (payload.message.sender.id !== userId) {
        socket.emit('markRead', { conversationId });
      }
    },
  );

  useChatSocketEvent<{ conversationId: string; message: MessageView }>(
    'messageEdited',
    (payload) => {
      if (payload.conversationId !== conversationId) return;
      updatePages((pages) =>
        mapMessages(pages, (m) => (m.id === payload.message.id ? payload.message : m)),
      );
    },
  );

  useChatSocketEvent<{ conversationId: string; messageId: string }>('messageDeleted', (payload) => {
    if (payload.conversationId !== conversationId) return;
    updatePages((pages) =>
      mapMessages(pages, (m) =>
        m.id === payload.messageId ? { ...m, isDeleted: true, body: null } : m,
      ),
    );
  });

  useChatSocketEvent<{ conversationId: string }>('messagesCleared', (payload) => {
    if (payload.conversationId !== conversationId) return;
    queryClient.setQueryData<InfiniteMessagesData>([CONVERSATION_MESSAGES_KEY, conversationId], {
      pages: [{ data: [], hasMore: false, nextCursor: null }],
      pageParams: [undefined],
    });
    queryClient.invalidateQueries({ queryKey: [CONVERSATION_MESSAGES_KEY, conversationId] });
  });

  useChatSocketEvent<{ conversationId: string }>('conversationDeleted', (payload) => {
    if (payload.conversationId !== conversationId) return;
    queryClient.removeQueries({ queryKey: [CONVERSATION_MESSAGES_KEY, conversationId] });
  });

  const handleReaction = (payload: { conversationId: string; message: MessageView }) => {
    if (payload.conversationId !== conversationId) return;
    updatePages((pages) =>
      mapMessages(pages, (m) => (m.id === payload.message.id ? payload.message : m)),
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
    if (p.conversationId !== conversationId) return;
    updatePages((pages) =>
      mapMessages(pages, (m) => (m.id === p.messageId ? { ...m, isPinned: true } : m)),
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
    if (p.conversationId !== conversationId) return;
    updatePages((pages) =>
      mapMessages(pages, (m) => (m.id === p.messageId ? { ...m, isPinned: false } : m)),
    );
    syncConversationPinned((pinned) => pinned.filter((m) => m.id !== p.messageId));
  });

  useChatSocketEvent<{
    conversationId: string;
    userId: string;
    messageId?: string | null;
    readAt: string;
  }>('messageRead', (payload) => {
    if (payload.conversationId !== conversationId) return;
    const readTimestamp = payload.readAt ? new Date(payload.readAt).getTime() : Date.now();

    updatePages((pages) =>
      mapMessages(pages, (m) => {
        const msgTime = new Date(m.createdAt).getTime();
        const isUpToWatermark = payload.messageId
          ? m.id === payload.messageId || msgTime <= readTimestamp
          : true;

        if (isUpToWatermark && !m.readBy.includes(payload.userId)) {
          return { ...m, readBy: [...m.readBy, payload.userId] };
        }
        return m;
      }),
    );
  });

  const typingTimerRef = useState(() => new Map<string, NodeJS.Timeout>())[0];

  useChatSocketEvent<{ conversationId: string; userId: string; isTyping: boolean }>(
    'typing',
    (payload) => {
      if (payload.conversationId !== conversationId || payload.userId === userId) return;

      const existing = typingTimerRef.get(payload.userId);
      if (existing) {
        clearTimeout(existing);
        typingTimerRef.delete(payload.userId);
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
          typingTimerRef.delete(payload.userId);
        }, 3500);
        typingTimerRef.set(payload.userId, timer);
      }
    },
  );

  return { typingUserIds };
}
