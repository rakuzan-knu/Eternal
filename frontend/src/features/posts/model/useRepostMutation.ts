import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';
import {
  FEED_KEY,
  USER_POSTS_KEY,
  USER_REPOSTS_KEY,
  SAVED_POSTS_KEY,
} from '@/shared/api/queryKeys';

export function useRepostMutation(
  postId: string | number,
  isReposted: boolean,
  currentQueryKey?: unknown[],
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (isReposted ? postsApi.unrepost(postId) : postsApi.repost(postId)),
    onMutate: async () => {
      const nextIsReposted = !isReposted;

      const updateFeedData = (old: InfiniteData<FeedPage> | undefined) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    isReposted: nextIsReposted,
                    reposts: Math.max(0, (p.reposts ?? 0) + (nextIsReposted ? 1 : -1)),
                  }
                : p,
            ),
          })),
        };
      };

      if (currentQueryKey) {
        queryClient.setQueryData<InfiniteData<FeedPage>>(currentQueryKey, updateFeedData);
      }
      queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: [FEED_KEY] }, updateFeedData);
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: [USER_POSTS_KEY] },
        updateFeedData,
      );
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: [USER_REPOSTS_KEY] },
        updateFeedData,
      );
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: [SAVED_POSTS_KEY] },
        updateFeedData,
      );
    },
    onSettled: () => {
      if (currentQueryKey) queryClient.invalidateQueries({ queryKey: currentQueryKey });
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_REPOSTS_KEY] });
    },
  });
}
