import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { PostType } from '@/entities/post/model/types';
import {
  FEED_KEY,
  USER_POSTS_KEY,
  USER_REPOSTS_KEY,
  SAVED_POSTS_KEY,
} from '@/shared/api/queryKeys';

export function useLikeMutation(postId: string | number, isLiked: boolean, queryKey?: unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        return await (isLiked ? postsApi.unlike(postId) : postsApi.like(postId));
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        // If user intended to like, and post is already liked (409 Conflict), accept idempotently
        if (!isLiked && status === 409) {
          return { success: true };
        }
        // If user intended to unlike, and like doesn't exist (404 Not Found), accept idempotently
        if (isLiked && status === 404) {
          return { success: true };
        }
        throw err;
      }
    },
    onMutate: async () => {
      const updater = (old: unknown) => patchFeedData(old, postId, isLiked);

      if (queryKey) {
        await queryClient.cancelQueries({ queryKey });
      }
      await queryClient.cancelQueries({ queryKey: [FEED_KEY] });
      await queryClient.cancelQueries({ queryKey: [USER_POSTS_KEY] });
      await queryClient.cancelQueries({ queryKey: [USER_REPOSTS_KEY] });
      await queryClient.cancelQueries({ queryKey: [SAVED_POSTS_KEY] });

      const prev = queryKey ? queryClient.getQueryData(queryKey) : undefined;

      if (queryKey) {
        queryClient.setQueryData(queryKey, updater);
      }
      queryClient.setQueriesData({ queryKey: [FEED_KEY] }, updater);
      queryClient.setQueriesData({ queryKey: [USER_POSTS_KEY] }, updater);
      queryClient.setQueriesData({ queryKey: [USER_REPOSTS_KEY] }, updater);
      queryClient.setQueriesData({ queryKey: [SAVED_POSTS_KEY] }, updater);

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (queryKey && ctx?.prev) {
        queryClient.setQueryData(queryKey, ctx.prev);
      }
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_REPOSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });
    },
    onSettled: () => {
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_REPOSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });
    },
  });
}

function patchFeedData(old: unknown, postId: string | number, isLiked: boolean): unknown {
  if (!old || typeof old !== 'object' || !('pages' in old)) return old;
  const inf = old as InfiniteData<Record<string, unknown>>;
  const targetId = String(postId);
  const nextIsLiked = !isLiked;

  return {
    ...inf,
    pages: inf.pages.map((page: Record<string, unknown>) => {
      // Standard FeedPage with .posts array
      if (Array.isArray(page.posts)) {
        return {
          ...page,
          posts: page.posts.map((p: PostType) => {
            if (String(p.id) !== targetId) return p;
            if (p.isLiked === nextIsLiked) return p;
            return {
              ...p,
              isLiked: nextIsLiked,
              likes: Math.max(0, (p.likes ?? 0) + (nextIsLiked ? 1 : -1)),
            };
          }),
        };
      }
      // CompactFeedResponse with .data array
      if (Array.isArray(page.data)) {
        return {
          ...page,
          data: page.data.map(
            (item: { id: string; viewer: { isLiked: boolean }; stats: { likes: number } }) => {
              if (String(item.id) !== targetId) return item;
              if (item.viewer?.isLiked === nextIsLiked) return item;
              return {
                ...item,
                viewer: { ...item.viewer, isLiked: nextIsLiked },
                stats: {
                  ...item.stats,
                  likes: Math.max(0, (item.stats?.likes ?? 0) + (nextIsLiked ? 1 : -1)),
                },
              };
            },
          ),
        };
      }
      return page;
    }),
  };
}
