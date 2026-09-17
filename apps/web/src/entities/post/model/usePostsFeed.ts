import { useInfiniteQuery } from '@tanstack/react-query';
import { FeedPage, postsApi } from '../api/postsApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes, queryGcTimes } from '@/shared/api/queryClient';

/** Server State: main feed (60s freshness, structural sharing by default). */
export function usePostsFeed() {
  return useInfiniteQuery<FeedPage>({
    queryKey: queryKeys.feed.list(),
    queryFn: ({ pageParam }) => postsApi.getFeed(pageParam as string | undefined),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: queryStaleTimes.feed,
    gcTime: queryGcTimes.default,
  });
}
