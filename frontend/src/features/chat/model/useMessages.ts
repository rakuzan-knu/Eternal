import { useInfiniteQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { CONVERSATION_MESSAGES_KEY } from '@/shared/api/queryKeys';

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

  const messages = query.data
    ? [...query.data.pages].reverse().flatMap((page) => [...page.data].reverse())
    : [];

  return { ...query, messages };
}
