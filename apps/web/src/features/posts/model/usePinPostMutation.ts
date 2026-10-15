import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';
import { PostType } from '@/entities/post/model/types';
import { mapPostFeedData } from '@/entities/post/model/mapPostFeedData';
import { invalidatePostFeedHistory } from '@/entities/post/model/postFeedColdCache';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { FEED_KEY, USER_POSTS_KEY } from '@/shared/api/queryKeys';

export function usePinPostMutation(
  postId: string | number,
  isPinned: boolean,
  currentQueryKey?: unknown[],
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (isPinned ? postsApi.unpin(postId) : postsApi.pin(postId)),
    onMutate: async () => {
      invalidatePostFeedHistory();
      const nextIsPinned = !isPinned;

      const updateFeedData = (old: InfiniteData<FeedPage> | undefined) => {
        return mapPostFeedData(old, (p: PostType) => {
          if (p.id === postId) {
            return {
              ...p,
              isPinned: nextIsPinned,
              pinnedAt: nextIsPinned ? new Date().toISOString() : null,
            };
          }
          // If pinning this post, unpin any other post of the same author (1 pinned post limit)
          if (nextIsPinned && p.isPinned) {
            return {
              ...p,
              isPinned: false,
              pinnedAt: null,
            };
          }
          return p;
        });
      };

      if (currentQueryKey) {
        queryClient.setQueryData<InfiniteData<FeedPage>>(currentQueryKey, updateFeedData);
      }
      queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: [FEED_KEY] }, updateFeedData);
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: [USER_POSTS_KEY] },
        updateFeedData,
      );

      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conversationId: '',
        messageId: '',
        title: nextIsPinned ? 'Post Pinned' : 'Post Unpinned',
        body: nextIsPinned
          ? 'Your post is now pinned to the top of your profile.'
          : 'Your post was unpinned from your profile.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    },
    onError: () => {
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conversationId: '',
        messageId: '',
        title: 'Action Failed',
        body: 'Could not update pin status. Please try again.',
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
    },
  });
}
