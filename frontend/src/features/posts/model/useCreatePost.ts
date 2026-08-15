import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';
import { PostType } from '@/entities/post/model/types';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';

export interface CreatePostPayload {
  formData: FormData;
  optimisticPost?: Partial<PostType>;
}

export function useCreatePost(queryKey: unknown[]) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: (payload: FormData | CreatePostPayload) => {
      const fd = payload instanceof FormData ? payload : payload.formData;
      return postsApi.createPost(fd);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedPage>>(queryKey);

      const fd = payload instanceof FormData ? payload : payload.formData;
      const customOptimistic = payload instanceof FormData ? undefined : payload.optimisticPost;
      const content = (fd.get('content') as string) || '';
      const tempId = `temp-${Date.now()}`;

      const optimisticPost: PostType = {
        id: tempId,
        authorId: currentUser?.id || 'me',
        author: currentUser?.displayName || currentUser?.username || 'You',
        handle: currentUser?.username || 'user',
        avatar: currentUser?.avatar || null,
        isVerified: currentUser?.isVerified || false,
        primaryBadge: currentUser?.primaryBadge || null,
        text: content,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        reposts: 0,
        sharesCount: 0,
        isLiked: false,
        isReposted: false,
        isSaved: false,
        isFollowing: false,
        isOwner: true,
        media: customOptimistic?.media || [],
        poll: customOptimistic?.poll || null,
        ...customOptimistic,
      };

      if (previousFeed && previousFeed.pages.length > 0) {
        queryClient.setQueryData<InfiniteData<FeedPage>>(queryKey, {
          ...previousFeed,
          pages: [
            {
              ...previousFeed.pages[0],
              posts: [optimisticPost, ...previousFeed.pages[0].posts],
            },
            ...previousFeed.pages.slice(1),
          ],
        });
      }

      return { previousFeed, tempId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(queryKey, context.previousFeed);
      }
    },
    onSuccess: (newPost, _variables, context) => {
      queryClient.setQueryData<InfiniteData<FeedPage>>(
        queryKey,
        (old: InfiniteData<FeedPage> | undefined) => {
          if (!old) return old;
          const tempId = context?.tempId;
          return {
            ...old,
            pages: old.pages.map((page: FeedPage) => ({
              ...page,
              posts: page.posts.map((p: PostType) => (p.id === tempId ? newPost : p)),
            })),
          };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
