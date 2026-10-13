import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes, queryGcTimes } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import type { InfiniteMessagesData, MessageView } from '@/entities/chat/model/types';
import {
  CHAT_CACHE_PAGE_HARD_LIMIT,
  dedupeMessages,
  sortMessagesChronologically,
} from './chatCacheSync';
import { flushRealtimeChatBatch } from './realtimeChatBatch';
import { fetchHistoryPage } from './historyRequests';
import {
  HISTORY_CACHE_TTL,
  HISTORY_PAGE_SIZE,
  HISTORY_WINDOW_PAGES,
  historyPage,
  historyWindowKey,
  newerHistoryParam,
  olderHistoryParam,
  type HistoryPage,
  type HistoryPageParam,
} from './historyWindow';

/**
 * One live head plus four separate history pages. Socket inserts never move
 * an old viewport. Evicted raw historical responses live only in IndexedDB.
 */
export function useMessages(conversationId: string | null) {
  const client = useQueryClient();
  const accountId = useAuthStore((s) => s.userId);
  const id = conversationId ?? '';
  const headKey = useMemo(() => queryKeys.conversations.messages(id), [id]);
  const windowKey = useMemo(() => historyWindowKey(id, accountId), [id, accountId]);
  const navigation = useRef<AbortController | null>(null);
  const edgeBusy = useRef(false);
  const head = useInfiniteQuery({
    queryKey: headKey,
    queryFn: async ({ signal }) => {
      const raw = await chatApi.getMessages(id, undefined, HISTORY_PAGE_SIZE, undefined, signal);
      flushRealtimeChatBatch(client);
      const old = client.getQueryData<InfiniteMessagesData>(headKey);
      const pending =
        old?.pages
          .flatMap((p) => p.data)
          .filter((m) => m.status === 'SENDING' || m.status === 'ERROR') ?? [];
      return {
        ...raw,
        data: sortMessagesChronologically(dedupeMessages([...raw.data, ...pending]))
          .reverse()
          .slice(0, CHAT_CACHE_PAGE_HARD_LIMIT),
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: () => undefined,
    maxPages: 1,
    enabled: !!conversationId,
    staleTime: queryStaleTimes.chat,
    gcTime: queryGcTimes.chat,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const window = useInfiniteQuery({
    queryKey: windowKey,
    queryFn: ({ pageParam, signal }) => fetchHistoryPage(client, id, accountId, pageParam, signal),
    initialPageParam: { direction: 'head' } as HistoryPageParam,
    getNextPageParam: olderHistoryParam,
    getPreviousPageParam: newerHistoryParam,
    maxPages: HISTORY_WINDOW_PAGES,
    enabled: false,
    staleTime: HISTORY_CACHE_TTL,
    gcTime: 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const fetchHistoryOlder = window.fetchNextPage;
  const fetchHistoryNewer = window.fetchPreviousPage;
  const refetchHead = head.refetch;

  useEffect(
    () => () => {
      navigation.current?.abort();
      navigation.current = null;
      edgeBusy.current = false;
      const cached = client.getQueryCache().find({ queryKey: windowKey, exact: true });
      if (!cached || cached.getObserversCount() <= 1) {
        void client.cancelQueries({ queryKey: windowKey, exact: true });
        client.removeQueries({ queryKey: windowKey, exact: true });
      }
    },
    [client, windowKey],
  );

  const loadOlder = useCallback(async () => {
    if (!conversationId || edgeBusy.current || navigation.current) return;
    edgeBusy.current = true;
    try {
      flushRealtimeChatBatch(client);
      let data = client.getQueryData<InfiniteData<HistoryPage, HistoryPageParam>>(windowKey);
      if (!data?.pages.length) {
        const live = client.getQueryData<InfiniteMessagesData>(headKey)?.pages[0];
        if (!live || !live.hasMore || !live.nextCursor) return;
        // The live head can grow to its realtime cap. Copy only its oldest
        // page into the historical viewport at the edge the reader reached.
        data = {
          pages: [
            historyPage({ ...live, data: live.data.slice(-HISTORY_PAGE_SIZE) }, 'head', false),
          ],
          pageParams: [{ direction: 'head' }],
        };
        client.setQueryData(windowKey, data);
      }
      if (!olderHistoryParam(data.pages.at(-1)!)) return;
      return await fetchHistoryOlder({ cancelRefetch: false });
    } finally {
      edgeBusy.current = false;
    }
  }, [conversationId, client, windowKey, headKey, fetchHistoryOlder]);

  const loadNewer = useCallback(async () => {
    if (!conversationId || edgeBusy.current || navigation.current) return;
    flushRealtimeChatBatch(client);
    const data = client.getQueryData<InfiniteData<HistoryPage, HistoryPageParam>>(windowKey);
    if (!data?.pages[0] || !newerHistoryParam(data.pages[0])) return;
    edgeBusy.current = true;
    try {
      return await fetchHistoryNewer({ cancelRefetch: false });
    } finally {
      edgeBusy.current = false;
    }
  }, [conversationId, client, windowKey, fetchHistoryNewer]);

  const anchor = useCallback(
    async (request: HistoryPageParam) => {
      if (!conversationId) return;
      navigation.current?.abort();
      const controller = new AbortController();
      navigation.current = controller;
      await client.cancelQueries({ queryKey: windowKey, exact: true });
      try {
        const page = await fetchHistoryPage(client, id, accountId, request, controller.signal);
        if (controller.signal.aborted) return;
        flushRealtimeChatBatch(client);
        if (page.data.length)
          client.setQueryData(windowKey, { pages: [page], pageParams: [request] });
        return page;
      } finally {
        if (navigation.current === controller) navigation.current = null;
      }
    },
    [conversationId, client, id, accountId, windowKey],
  );
  const loadAroundMessage = useCallback(
    (messageId: string) => anchor({ direction: 'around-message', cursor: messageId }),
    [anchor],
  );
  const loadAroundDate = useCallback(
    (dateIso: string) => anchor({ direction: 'around-date', cursor: dateIso }),
    [anchor],
  );
  const resetToLive = useCallback(async () => {
    navigation.current?.abort();
    navigation.current = null;
    await client.cancelQueries({ queryKey: windowKey, exact: true });
    await client.cancelQueries({ queryKey: headKey, exact: true });
    flushRealtimeChatBatch(client);
    // Keep the disabled observer attached to an empty query. Removing an
    // observed query does not notify it and can leave its old window visible.
    client.setQueryData(windowKey, { pages: [], pageParams: [] });
    client.setQueryData<InfiniteMessagesData>(headKey, (old) =>
      old ? { pages: old.pages.slice(0, 1), pageParams: [undefined] } : old,
    );
    return await refetchHead();
  }, [client, windowKey, headKey, refetchHead]);

  const isAnchoredInHistory = !!window.data?.pages.length;
  const visible = isAnchoredInHistory ? window.data : head.data;
  const messages = useMemo<MessageView[]>(
    () =>
      sortMessagesChronologically(
        dedupeMessages(visible?.pages.flatMap((p) => (Array.isArray(p?.data) ? p.data : [])) ?? []),
      ),
    [visible],
  );
  const live = head.data?.pages[0];
  return {
    ...head,
    data: visible,
    messages,
    isAnchoredInHistory,
    hasNextPage: isAnchoredInHistory ? window.hasNextPage : !!(live?.hasMore && live.nextCursor),
    hasPreviousPage: isAnchoredInHistory && window.hasPreviousPage,
    hasNewer: isAnchoredInHistory && window.hasPreviousPage,
    isFetchingNextPage: window.isFetchingNextPage,
    isFetchingPreviousPage: window.isFetchingPreviousPage,
    isFetchingHistory: window.isFetching,
    fetchNextPage: loadOlder,
    fetchPreviousPage: loadNewer,
    loadOlder,
    loadNewer,
    loadAroundMessage,
    loadAroundDate,
    resetToLive,
  };
}
