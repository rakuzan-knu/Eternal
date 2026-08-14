import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { followApi, FollowListPage } from '../api/followApi';
import type { UserProfile } from '@/entities/profile/model/types';
import { USER_KEY, FOLLOW_LIST_KEY } from '@/shared/api/queryKeys';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

export function useFollowMutation(id: string, isFollowing: boolean) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (isFollowing ? followApi.unfollow(id) : followApi.follow(id)),
    onMutate: async () => {
      // 1. Cancel running queries to avoid race condition overwrite
      await queryClient.cancelQueries({ queryKey: [USER_KEY] });
      await queryClient.cancelQueries({ queryKey: [FOLLOW_LIST_KEY] });

      // 2. Snapshot previous values for rollback
      const previousUsers = queryClient.getQueriesData<UserProfile>({ queryKey: [USER_KEY] });
      const previousFollowLists = queryClient.getQueriesData<InfiniteData<FollowListPage>>({
        queryKey: [FOLLOW_LIST_KEY],
      });

      const nextIsFollowing = !isFollowing;

      // 3. Optimistically update user profile cache
      queryClient.setQueriesData<UserProfile>(
        {
          queryKey: [USER_KEY],
          predicate: (q) => (q.state.data as UserProfile | undefined)?.id === id,
        },
        (old) =>
          old && {
            ...old,
            isFollowing: nextIsFollowing,
            followersCount: Math.max(0, (old.followersCount ?? 0) + (nextIsFollowing ? 1 : -1)),
          },
      );

      // 4. Optimistically update follow lists cache
      queryClient.setQueriesData<InfiniteData<FollowListPage>>(
        { queryKey: [FOLLOW_LIST_KEY] },
        (old) =>
          old?.pages && {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((u) =>
                u.id === id ? { ...u, isFollowing: nextIsFollowing } : u,
              ),
            })),
          },
      );

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
    },
  });
}
