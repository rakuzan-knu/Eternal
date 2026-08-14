import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { followApi, FollowListPage } from '../api/followApi';
import type { UserProfile } from '@/entities/profile/model/types';
import { USER_KEY, FOLLOW_LIST_KEY } from '@/shared/api/queryKeys';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

export function useRemoveFollowerMutation(profileUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (followerId: string) => followApi.removeFollower(followerId),
    onMutate: async (followerId: string) => {
      // 1. Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: [FOLLOW_LIST_KEY] });
      await queryClient.cancelQueries({ queryKey: [USER_KEY] });

      // 2. Snapshot previous values for rollback
      const previousFollowLists = queryClient.getQueriesData<InfiniteData<FollowListPage>>({
        queryKey: [FOLLOW_LIST_KEY],
      });
      const previousUsers = queryClient.getQueriesData<UserProfile>({ queryKey: [USER_KEY] });

      // 3. Optimistically remove user from follower lists immediately
      queryClient.setQueriesData<InfiniteData<FollowListPage>>(
        { queryKey: [FOLLOW_LIST_KEY] },
        (old) =>
          old?.pages && {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((u) => u.id !== followerId),
            })),
          },
      );

      // 4. Optimistically decrement followers count
      queryClient.setQueriesData<UserProfile>(
        {
          queryKey: [USER_KEY],
          predicate: (q) => (q.state.data as UserProfile | undefined)?.id === profileUserId,
        },
        (old) => old && { ...old, followersCount: Math.max(0, (old.followersCount ?? 0) - 1) },
      );

      return { previousFollowLists, previousUsers };
    },
    onError: (_err, _followerId, context) => {
      // Rollback optimistic updates
      if (context?.previousFollowLists) {
        for (const [key, data] of context.previousFollowLists) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousUsers) {
        for (const [key, data] of context.previousUsers) {
          queryClient.setQueryData(key, data);
        }
      }
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conversationId: '',
        messageId: '',
        title: 'Action Failed',
        body: 'Failed to remove follower. Please try again.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [FOLLOW_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
    },
  });
}
