import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';

export function useCreatePost(queryKey: unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => postsApi.createPost(formData),
    onSuccess: (newPost) => {
      queryClient.setQueryData<InfiniteData<FeedPage>>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: [
            { ...old.pages[0], posts: [newPost, ...old.pages[0].posts] },
            ...old.pages.slice(1),
          ],
        };
      });
    },
  });
}
