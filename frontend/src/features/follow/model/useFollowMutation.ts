import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { followApi, FollowListPage } from '../api/followApi';
import type { UserProfile } from '@/entities/profile/model/types';
import { USER_KEY, FOLLOW_LIST_KEY } from '@/shared/api/queryKeys';

export function useFollowMutation(id: string, isFollowing: boolean) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (isFollowing ? followApi.unfollow(id) : followApi.follow(id)),
    onMutate: async () => {
      const nextIsFollowing = !isFollowing;

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
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
      queryClient.invalidateQueries({ queryKey: [FOLLOW_LIST_KEY] });
    },
  });
}
