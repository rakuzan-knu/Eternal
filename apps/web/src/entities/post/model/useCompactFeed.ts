import { CompactFeedResponse, postsApi } from '../api/postsApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { useBoundedPostFeed } from './useBoundedPostFeed';

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

  const query = useBoundedPostFeed<CompactFeedResponse>({
    queryKey: [...queryKeys.feed.compact(algorithm), limit],
    fetchPage: (cursor, signal) => postsApi.getCompactFeed(cursor, limit, algorithm, signal),
    getCount: (page) => page.data.length,
    getNextCursor: (page) => page.meta.nextCursor,
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
