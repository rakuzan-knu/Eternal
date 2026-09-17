import { useInfiniteQuery } from '@tanstack/react-query';
import { followApi } from '../api/followApi';
import { FOLLOW_LIST_KEY } from '@/shared/api/queryKeys';

export function useFollowList(userId: string, mode: 'followers' | 'following') {
  return useInfiniteQuery({
    queryKey: [FOLLOW_LIST_KEY, mode, userId],
    queryFn: ({ pageParam }) =>
      mode === 'followers'
        ? followApi.getFollowers(userId, pageParam as string | undefined)
        : followApi.getFollowing(userId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
