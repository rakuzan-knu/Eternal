import { useInfiniteQuery } from '@tanstack/react-query';
import { FeedPage, postsApi } from '../api/postsApi';
import { FEED_KEY } from '@/shared/api/queryKeys';

export function usePostsFeed() {
  return useInfiniteQuery<FeedPage>({
    queryKey: [FEED_KEY],
    queryFn: ({ pageParam }) => postsApi.getFeed(pageParam as string | undefined),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
