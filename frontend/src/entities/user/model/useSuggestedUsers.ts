import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/shared/api/httpClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { followApi, type FollowUserSummary } from '@/features/follow/api/followApi';

export function useSuggestedUsers(limit = 5) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<FollowUserSummary[]>({
    queryKey: ['suggestedUsers', limit],
    queryFn: async (): Promise<FollowUserSummary[]> => {
      const res = await api.get<FollowUserSummary[]>(`/users/suggested?limit=${limit}`);
      const list = Array.isArray(res.data) ? res.data : [];
      return list.map((u) => ({
        id: u.id ?? '',
        username: u.username ?? 'user',
        displayName: u.displayName ?? u.username ?? 'User',
        avatar: u.avatar ?? null,
        bio: u.bio ?? null,
        isFollowing: Boolean(u.isFollowing),
        followsYou: Boolean(u.followsYou),
        isFriend: Boolean(u.isFriend),
        isVerified: Boolean(u.isVerified),
        primaryBadge: u.primaryBadge ?? null,
        recommendationReason: u.recommendationReason ?? null,
      }));
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useDismissSuggestedUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetId: string) => followApi.dismissSuggestedUser(targetId),
    onMutate: async (targetId: string) => {
      await queryClient.cancelQueries({ queryKey: ['suggestedUsers'] });

      const previousQueries = queryClient.getQueriesData<FollowUserSummary[]>({
        queryKey: ['suggestedUsers'],
      });

      queryClient.setQueriesData<FollowUserSummary[]>(
        { queryKey: ['suggestedUsers'] },
        (old: FollowUserSummary[] | undefined) =>
          old ? old.filter((user: FollowUserSummary) => user.id !== targetId) : [],
      );

      return { previousQueries };
    },
    onError: (_err, _targetId, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestedUsers'] });
    },
  });
}
