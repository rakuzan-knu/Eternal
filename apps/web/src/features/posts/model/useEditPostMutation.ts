import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';
import { PostType } from '@/entities/post/model/types';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import {
  FEED_KEY,
  USER_POSTS_KEY,
  USER_REPOSTS_KEY,
  SAVED_POSTS_KEY,
} from '@/shared/api/queryKeys';

export function useEditPostMutation(postId: string | number, currentQueryKey?: unknown[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newContent: string) => postsApi.editPost(postId, newContent),
    onMutate: async (newContent: string) => {
      const updateFeedData = (old: InfiniteData<FeedPage> | undefined) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p: PostType) =>
              p.id === postId ? { ...p, text: newContent } : p,
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
    onError: () => {
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conversationId: '',
        messageId: '',
        title: 'Edit Failed',
        body: 'Failed to update post. Please try again.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    },
    onSuccess: () => {
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conversationId: '',
        messageId: '',
        title: 'Post Updated',
        body: 'Your post was successfully updated.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    },
    onSettled: () => {
      if (currentQueryKey) queryClient.invalidateQueries({ queryKey: currentQueryKey });
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });
    },
  });
}
