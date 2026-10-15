import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';
import { PostType } from '@/entities/post/model/types';
import { mapPostFeedData } from '@/entities/post/model/mapPostFeedData';
import { invalidatePostFeedHistory } from '@/entities/post/model/postFeedColdCache';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import {
  FEED_KEY,
  USER_POSTS_KEY,
  USER_REPOSTS_KEY,
  SAVED_POSTS_KEY,
} from '@/shared/api/queryKeys';

export function useDeletePostMutation(postId: string | number, currentQueryKey?: unknown[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postsApi.deletePost(postId),
    onMutate: async () => {
      invalidatePostFeedHistory();
      const removePostFromFeed = (old: InfiniteData<FeedPage> | undefined) => {
        return mapPostFeedData(old, (p: PostType) => (String(p.id) === String(postId) ? null : p));
      };

      if (currentQueryKey) {
        queryClient.setQueryData<InfiniteData<FeedPage>>(currentQueryKey, removePostFromFeed);
      }
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: [FEED_KEY] },
        removePostFromFeed,
      );
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: [USER_POSTS_KEY] },
        removePostFromFeed,
      );
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: [USER_REPOSTS_KEY] },
        removePostFromFeed,
      );
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: [SAVED_POSTS_KEY] },
        removePostFromFeed,
      );
    },
    onError: () => {
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conversationId: '',
        messageId: '',
        title: 'Delete Failed',
        body: 'Failed to delete post. Please try again.',
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
        title: 'Post Deleted',
        body: 'Your post was removed.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    },
    onSettled: () => {
      invalidatePostFeedHistory();
      if (currentQueryKey) queryClient.invalidateQueries({ queryKey: currentQueryKey });
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_REPOSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });
    },
  });
}
