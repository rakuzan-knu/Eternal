import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { CONVERSATION_MESSAGES_KEY } from '@/shared/api/queryKeys';
import { MessageView } from '../../../entities/chat/model/types';

export function useMessages(conversationId: string | null) {
  const query = useInfiniteQuery({
    queryKey: [CONVERSATION_MESSAGES_KEY, conversationId],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      chatApi.getMessages(conversationId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled: !!conversationId,
    staleTime: 1000 * 10,
  });

  const messages = useMemo(() => {
    if (!query.data) return [];
    const raw = [...query.data.pages].reverse().flatMap((page) => [...page.data].reverse());
    const seen = new Set<string>();
    const result: MessageView[] = [];
    for (const m of raw) {
      const key = m.id || m.tempId || m.clientMessageId;
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      result.push(m);
    }
    return result;
  }, [query.data]);

  return { ...query, messages };
}
