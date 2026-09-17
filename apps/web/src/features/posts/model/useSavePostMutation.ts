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
    mutationFn: async () => {
      try {
        return await (isSaved ? postsApi.unsave(postId) : postsApi.save(postId));
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (!isSaved && status === 409) return { success: true };
        if (isSaved && status === 404) return { success: true };
        throw err;
      }
    },
    onMutate: async () => {
      const nextIsSaved = !isSaved;
      const targetId = String(postId);

      const updateFeedData = (old: InfiniteData<FeedPage> | undefined) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) => {
              if (String(p.id) !== targetId) return p;
              if (p.isSaved === nextIsSaved) return p;
              return { ...p, isSaved: nextIsSaved };
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
      if (currentQueryKey) queryClient.invalidateQueries({ queryKey: currentQueryKey });
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_REPOSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });

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
      queryClient.invalidateQueries({ queryKey: [USER_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_REPOSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });
    },
  });
}
