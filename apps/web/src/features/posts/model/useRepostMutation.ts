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
    mutationFn: async () => {
      try {
        return await (isReposted ? postsApi.unrepost(postId) : postsApi.repost(postId));
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (!isReposted && status === 409) return { success: true };
        if (isReposted && status === 404) return { success: true };
        throw err;
      }
    },
    onMutate: async () => {
      const nextIsReposted = !isReposted;
      const targetId = String(postId);

      const updateFeedData = (old: InfiniteData<FeedPage> | undefined) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) => {
              if (String(p.id) !== targetId) return p;
              // Guard against double increment/decrement across matching queries
              if (p.isReposted === nextIsReposted) return p;
              return {
                ...p,
                isReposted: nextIsReposted,
                reposts: Math.max(0, (p.reposts ?? 0) + (nextIsReposted ? 1 : -1)),
              };
            }),
          })),
        };
      };

      if (currentQueryKey) {
        await queryClient.cancelQueries({ queryKey: currentQueryKey });
      }
      await queryClient.cancelQueries({ queryKey: [FEED_KEY] });
      await queryClient.cancelQueries({ queryKey: [USER_POSTS_KEY] });
      await queryClient.cancelQueries({ queryKey: [USER_REPOSTS_KEY] });
      await queryClient.cancelQueries({ queryKey: [SAVED_POSTS_KEY] });

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
    onError: () => {
      if (currentQueryKey) queryClient.invalidateQueries({ queryKey: currentQueryKey });
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_REPOSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });
    },
    onSettled: () => {
      if (currentQueryKey) queryClient.invalidateQueries({ queryKey: currentQueryKey });
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_REPOSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });
    },
  });
}
