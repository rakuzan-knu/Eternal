import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import {
  FEED_KEY,
  USER_POSTS_KEY,
  USER_REPOSTS_KEY,
  SAVED_POSTS_KEY,
} from '@/shared/api/queryKeys';

export function useSavePostMutation(
  postId: string | number,
  isSaved: boolean,
  currentQueryKey?: unknown[],
) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: () => (isSaved ? postsApi.unsave(postId) : postsApi.save(postId)),
    onMutate: async () => {
      const nextIsSaved = !isSaved;

      const updateFeedData = (old: InfiniteData<FeedPage> | undefined) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) => (p.id === postId ? { ...p, isSaved: nextIsSaved } : p)),
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

      // Trigger Instagram-style toast
      if (nextIsSaved) {
        useMessageToastStore.getState().addToast({
          id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          conversationId: '',
          messageId: '',
          title: 'Saved',
          body: 'The item has been saved.',
          linkUrl: currentUser?.username ? `/${currentUser.username}?tab=saved` : undefined,
          avatar: null,
          memberAvatars: [],
          isGroup: false,
        });
      } else {
        useMessageToastStore.getState().addToast({
          id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          conversationId: '',
          messageId: '',
          title: 'Removed',
          body: 'The item has been removed from saved posts.',
          avatar: null,
          memberAvatars: [],
          isGroup: false,
        });
      }
    },
    onError: () => {
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conversationId: '',
        messageId: '',
        title: 'Action Failed',
        body: 'Could not update saved status. Please try again.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    },
    onSettled: () => {
      if (currentQueryKey) queryClient.invalidateQueries({ queryKey: currentQueryKey });
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });
    },
  });
}
