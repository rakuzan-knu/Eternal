import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { followApi, FollowListPage } from '../api/followApi';
import type { UserProfile } from '@/entities/profile/model/types';
import { USER_KEY, FOLLOW_LIST_KEY } from '@/shared/api/queryKeys';

export function useRemoveFollowerMutation(profileUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (followerId: string) => followApi.removeFollower(followerId),
    onSuccess: (_data, followerId) => {
      queryClient.setQueriesData<InfiniteData<FollowListPage>>(
        { queryKey: [FOLLOW_LIST_KEY, 'followers', profileUserId] },
        (old) =>
          old?.pages && {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((u) => u.id !== followerId),
            })),
          },
      );
      queryClient.setQueriesData<UserProfile>(
        {
          queryKey: [USER_KEY],
          predicate: (q) => (q.state.data as UserProfile | undefined)?.id === profileUserId,
        },
        (old) => old && { ...old, followersCount: Math.max(0, (old.followersCount ?? 0) - 1) },
      );
    },
  });
}
