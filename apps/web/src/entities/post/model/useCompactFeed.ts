import { useInfiniteQuery } from '@tanstack/react-query';
import { CompactFeedResponse, postsApi } from '../api/postsApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes, queryGcTimes } from '@/shared/api/queryClient';

export interface UseCompactFeedOptions {
  algorithm?: 'latest' | 'ml';
  limit?: number;
}

/**
 * Server State: Compact BFF Feed with offline IndexedDB support.
 * Designed for low-latency, mobile, and offline-first rendering.
 */
export function useCompactFeed(options: UseCompactFeedOptions = {}) {
  const algorithm = options.algorithm ?? 'latest';
  const limit = options.limit ?? 20;

  const query = useInfiniteQuery<CompactFeedResponse>({
    queryKey: queryKeys.feed.compact(algorithm),
    queryFn: ({ pageParam, signal }) =>
      postsApi.getCompactFeed(pageParam as string | undefined, limit, algorithm, signal),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: queryStaleTimes.feed,
    gcTime: queryGcTimes.default,
  });

  const allItems = query.data?.pages.flatMap((page) => page.data) ?? [];
  const isEmpty = !query.isLoading && allItems.length === 0;

  return {
    ...query,
    items: allItems,
    isEmpty,
    // Explicit state helpers adhering to Enterprise UI guidelines
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
