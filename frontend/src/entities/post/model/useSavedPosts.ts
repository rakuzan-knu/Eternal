import { useInfiniteQuery } from '@tanstack/react-query';
import { postsApi, FeedPage } from '../api/postsApi';
import { SAVED_POSTS_KEY } from '@/shared/api/queryKeys';

export function useSavedPosts() {
  return useInfiniteQuery<FeedPage>({
    queryKey: [SAVED_POSTS_KEY],
    queryFn: ({ pageParam }) => postsApi.getSavedPosts(pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
  });
}
