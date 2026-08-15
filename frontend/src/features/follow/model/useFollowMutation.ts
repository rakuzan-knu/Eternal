import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { followApi, FollowListPage } from '../api/followApi';
import type { UserProfile } from '@/entities/profile/model/types';
import { USER_KEY, FOLLOW_LIST_KEY, FRIENDS_KEY } from '@/shared/api/queryKeys';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useFollowMutation(id: string, isFollowing: boolean) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (isFollowing ? followApi.unfollow(id) : followApi.follow(id)),
    onMutate: async () => {
      const myUserId = useAuthStore.getState().userId;
      const nextIsFollowing = !isFollowing;

      // 1. Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: [USER_KEY] });
      await queryClient.cancelQueries({ queryKey: [FOLLOW_LIST_KEY] });

      // 2. Snapshot previous values for rollback
      const previousUsers = queryClient.getQueriesData<UserProfile>({ queryKey: [USER_KEY] });
      const previousFollowLists = queryClient.getQueriesData<InfiniteData<FollowListPage>>({
        queryKey: [FOLLOW_LIST_KEY],
      });

      // 3. Optimistically update target user's profile and current user's profile
      queryClient.setQueriesData<UserProfile>({ queryKey: [USER_KEY] }, (old) => {
        if (!old) return old;
        // Target user profile
        if (old.id === id) {
          return {
            ...old,
            isFollowing: nextIsFollowing,
            followersCount: Math.max(0, (old.followersCount ?? 0) + (nextIsFollowing ? 1 : -1)),
          };
        }
        // Current user profile (updates followingCount)
        if (myUserId && old.id === myUserId) {
          return {
            ...old,
            followingCount: Math.max(0, (old.followingCount ?? 0) + (nextIsFollowing ? 1 : -1)),
          };
        }
        return old;
      });

      // 4. Optimistically update follow lists cache
      queryClient.setQueriesData<InfiniteData<FollowListPage>>(
        { queryKey: [FOLLOW_LIST_KEY] },
        (old) => {
          if (!old?.pages) return old;

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((u) =>
                u.id === id ? { ...u, isFollowing: nextIsFollowing } : u,
              ),
            })),
          };
        },
      );

      // If unfollowed and current user has an active following list, also update it
      if (myUserId && !nextIsFollowing) {
        queryClient.setQueryData<InfiniteData<FollowListPage>>(
          [FOLLOW_LIST_KEY, myUserId, 'following'],
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.filter((u) => u.id !== id),
              })),
            };
          },
        );
      }

      return { previousUsers, previousFollowLists };
    },
    onError: (_err, _vars, context) => {
      // Rollback optimistic updates
      if (context?.previousUsers) {
        for (const [key, data] of context.previousUsers) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousFollowLists) {
        for (const [key, data] of context.previousFollowLists) {
          queryClient.setQueryData(key, data);
        }
      }
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conversationId: '',
        messageId: '',
        title: 'Action Failed',
        body: 'Failed to update follow status. Please try again.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
      queryClient.invalidateQueries({ queryKey: [FOLLOW_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [FRIENDS_KEY] });
    },
  });
}
