import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CONVERSATION_MESSAGES_KEY } from '@/shared/api/queryKeys';
import { InfiniteMessagesData, PaginatedMessages } from '../../../entities/chat/model/types';
import { useChatSocket } from './useChatSocket';
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

      // 1. Instant optimistic update
      updatePages((pages) =>
        pages.map((p) => ({
          ...p,
          data: p.data.map((m) => {
            if (m.id !== messageId) return m;
            const existingIdx = m.reactions.findIndex((r) => r.emoji === emoji);
            let nextReactions = [...m.reactions];

            if (currentSelfReacted) {
              // Remove reaction
              if (existingIdx !== -1) {
                const prev = nextReactions[existingIdx];
                if (prev.count <= 1) {
                  nextReactions = nextReactions.filter((r) => r.emoji !== emoji);
                } else {
                  nextReactions[existingIdx] = {
                    ...prev,
                    count: prev.count - 1,
                    selfReacted: false,
                    users: prev.users || [],
                  };
                }
              }
            } else {
              // Add reaction
              if (existingIdx !== -1) {
                const prev = nextReactions[existingIdx];
                nextReactions[existingIdx] = {
                  ...prev,
                  count: prev.selfReacted ? prev.count : prev.count + 1,
                  selfReacted: true,
                  users: prev.users || [],
                };
              } else {
                nextReactions.push({ emoji, count: 1, selfReacted: true, users: [] });
              }
            }

            return { ...m, reactions: nextReactions };
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
