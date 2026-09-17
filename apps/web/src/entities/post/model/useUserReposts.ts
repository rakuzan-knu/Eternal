import { useInfiniteQuery } from '@tanstack/react-query';
import { postsApi, FeedPage } from '../api/postsApi';
import { USER_REPOSTS_KEY } from '@/shared/api/queryKeys';

export function useUserReposts(userId: string) {
  return useInfiniteQuery<FeedPage>({
    queryKey: [USER_REPOSTS_KEY, userId],
    queryFn: ({ pageParam }) => postsApi.getUserReposts(userId, pageParam as string | undefined),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!userId,
  });
}
