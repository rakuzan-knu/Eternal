import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { applyRestDelta, getLatestLocalMessageId } from './chatCacheSync';
import { getSocket } from '@/shared/api/socket';

/**
 * Enterprise gap-filling on reconnect (offline-first).
 *
 * Strategy (in order):
 *  1. WS `gatewayResume` replay (server event buffer, keyed by per-user `seq`)
 *     — handled centrally in `useMessengerRealtime`; this hook is the REST
 *     fallback for everything the buffer cannot cover.
 *  2. REST delta per conversation: `GET /messages?after=<latestLocalId>`.
 *     Message ids are Snowflakes (time-ordered), so `after` returns exactly
 *     the missed tail without re-downloading history.
 *  3. Full `invalidateQueries` only when the delta endpoint fails or the
 *     server explicitly demands resync (`resyncRequired`).
 *
 * Call with the ids of conversations currently mounted. Reconnect, window
 * `online`, and tab-wake all trigger a fill.
 */

const FILL_LIMIT = 50;
const FILL_DEBOUNCE_MS = 750;

interface GapFillResult {
  filled: number;
  failed: string[];
}

export function useChatGapFill(conversationIds: string[]) {
  const queryClient = useQueryClient();
  const idsRef = useRef<string[]>(conversationIds);
  idsRef.current = conversationIds;
  const inFlightRef = useRef(false);
  const lastFillAtRef = useRef(0);

  const fillConversation = useCallback(
    async (conversationId: string): Promise<number> => {
      const after = getLatestLocalMessageId(queryClient, conversationId);
      // No local baseline: let the normal infinite query fetch history.
      if (!after) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages(conversationId),
        });
        return 0;
      }
      try {
        const page = await chatApi.getMessages(conversationId, undefined, FILL_LIMIT, after);
        const delta = page?.data ?? [];
        return applyRestDelta(queryClient, conversationId, delta);
      } catch {
        // REST delta failed (offline/permissions): schedule reconciling fetch.
        await queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages(conversationId),
        });
        return 0;
      }
    },
    [queryClient],
  );

  const fillAllGaps = useCallback(async (): Promise<GapFillResult> => {
    const now = Date.now();
    if (inFlightRef.current || now - lastFillAtRef.current < FILL_DEBOUNCE_MS) {
      return { filled: 0, failed: [] };
    }
    inFlightRef.current = true;
    lastFillAtRef.current = now;
    const ids = [...new Set(idsRef.current.filter(Boolean))];
    let filled = 0;
    const failed: string[] = [];
    try {
      const results = await Promise.allSettled(ids.map((id) => fillConversation(id)));
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') filled += r.value;
        else failed.push(ids[i]);
      });
    } finally {
      inFlightRef.current = false;
    }
    // Conversation list preview/unread counts reconcile in background.
    if (ids.length > 0) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
    }
    return { filled, failed };
  }, [fillConversation, queryClient]);

  // Socket reconnect + explicit server resync demand → gap-fill.
  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => {
      void fillAllGaps();
    };
    const onResync = () => {
      void fillAllGaps();
    };
    const onOnline = () => {
      void fillAllGaps();
    };
    socket.on('connect', onConnect);
    socket.on('resyncRequired', onResync);
    window.addEventListener('online', onOnline);
    return () => {
      socket.off('connect', onConnect);
      socket.off('resyncRequired', onResync);
      window.removeEventListener('online', onOnline);
    };
  }, [fillAllGaps]);

  return { fillConversation, fillAllGaps };
}
