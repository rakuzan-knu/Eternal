import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes, queryGcTimes } from '@/shared/api/queryClient';
import { MessageView } from '../../../entities/chat/model/types';

/**
 * Server State: paginated chat history (TanStack Query, infinite).
 * Freshness: `staleTime: 0` — messages are realtime via Socket.io deltas
 * applied with `setQueryData`; REST is only the initial cursor + gap-fill.
 */
export function useMessages(conversationId: string | null) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.conversations.messages(conversationId ?? ''),
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      chatApi.getMessages(conversationId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled: !!conversationId,
    staleTime: queryStaleTimes.chat,
    gcTime: queryGcTimes.chat,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const messages = useMemo(() => {
    if (!query.data) return [];
    const raw = [...query.data.pages]
      .reverse()
      .flatMap((page) => [...(Array.isArray(page?.data) ? page.data : [])].reverse());
    const seen = new Set<string>();
    const result: MessageView[] = new Array<MessageView>(raw.length);
    let count = 0;
    for (const m of raw) {
      const key = m.id || m.tempId || m.clientMessageId;
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      result[count++] = m;
    }
    result.length = count;

    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (timeA !== timeB) return timeA - timeB;
      if (a.sender?.id === b.sender?.id && a.clientSeq != null && b.clientSeq != null) {
        return a.clientSeq - b.clientSeq;
      }
      return (a.id || '').localeCompare(b.id || '');
    });

    return result;
  }, [query.data]);

  return { ...query, messages };
}
