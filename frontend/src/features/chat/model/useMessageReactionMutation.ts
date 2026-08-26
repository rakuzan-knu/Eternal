import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CONVERSATION_MESSAGES_KEY } from '@/shared/api/queryKeys';
import { InfiniteMessagesData, PaginatedMessages } from '../../../entities/chat/model/types';
import { useChatSocket } from './useChatSocket';
import { AckResponse } from './chatSocketTypes';
import { useAuthStore } from '@/shared/model/useAuthStore';

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

export function useMessageReactionMutation(conversationId: string | null) {
  const socket = useChatSocket();
  const queryClient = useQueryClient();

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

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string, currentSelfReacted: boolean) => {
      if (!conversationId) return;
      const currentUserId = useAuthStore.getState().userId;

      // 1. Instant optimistic update
      updatePages((pages) =>
        pages.map((p) => ({
          ...p,
          data: p.data.map((m) => {
            if (m.id !== messageId) return m;

            if (currentSelfReacted) {
              // Remove reaction
              const existingIdx = m.reactions.findIndex((r) => r.emoji === emoji);
              if (existingIdx === -1) return m;
              let nextReactions = [...m.reactions];
              const prev = nextReactions[existingIdx];
              if (prev.count <= 1) {
                nextReactions = nextReactions.filter((r) => r.emoji !== emoji);
              } else {
                nextReactions[existingIdx] = {
                  ...prev,
                  count: prev.count - 1,
                  selfReacted: false,
                  users: currentUserId
                    ? (prev.users || []).filter((u) => u.id !== currentUserId)
                    : prev.users || [],
                };
              }
              return { ...m, reactions: nextReactions };
            } else {
              // Add reaction -> Replace any previous self reaction with the new one
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
            }
          }),
        })),
      );

      // 2. Dispatch in background
      try {
        if (currentSelfReacted) {
          await emitWithAck(socket, 'removeReaction', { messageId, emoji });
        } else {
          await emitWithAck(socket, 'addReaction', { messageId, emoji });
        }
      } catch (err) {
        console.error('Reaction mutation failed:', err);
      }
    },
    [conversationId, socket, updatePages],
  );

  return { toggleReaction };
}
