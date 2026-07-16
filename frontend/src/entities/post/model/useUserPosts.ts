import { useInfiniteQuery } from '@tanstack/react-query';
import { postsApi, FeedPage } from '../api/postsApi';
import { USER_POSTS_KEY } from '@/shared/api/queryKeys';

export function useUserPosts(userId: string) {
  return useInfiniteQuery<FeedPage>({
    queryKey: [USER_POSTS_KEY, userId],
    queryFn: ({ pageParam }) => postsApi.getUserPosts(userId, pageParam as string | undefined),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!userId,
  });
}
