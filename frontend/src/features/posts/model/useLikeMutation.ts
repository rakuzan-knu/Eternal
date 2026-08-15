import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';
import { PostType } from '@/shared/model/useUIStore';

export function useLikeMutation(postId: string | number, isLiked: boolean, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => (isLiked ? postsApi.unlike(postId) : postsApi.like(postId)),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<InfiniteData<FeedPage>>(queryKey);
      queryClient.setQueryData<InfiniteData<FeedPage>>(
        queryKey,
        (old: InfiniteData<FeedPage> | undefined) =>
          patchPost(old, postId, (p: PostType) => ({
            ...p,
            isLiked: !isLiked,
            likes: (p.likes ?? 0) + (isLiked ? -1 : 1),
          })),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => ctx && queryClient.setQueryData(queryKey, ctx.prev),
  });
}

function patchPost(
  old: InfiniteData<FeedPage> | undefined,
  postId: string | number,
  updater: (p: PostType) => PostType,
): InfiniteData<FeedPage> | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page: FeedPage) => ({
      ...page,
      posts: page.posts.map((p: PostType) => (p.id === postId ? updater(p) : p)),
    })),
  };
}
