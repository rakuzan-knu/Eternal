import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { followRequestsApi } from '../api/followRequestsApi';

import type { FollowRequestUser } from '../model/privacyTypes';

export interface FollowRequestsResponse {
  data: FollowRequestUser[];
  meta: { nextCursor: string | null; hasNextPage: boolean };
}

/** Server State: follow requests (short freshness — security data). */
export function useFollowRequests(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGameModeOpen = useSpotifyPlayerStore((s) => s.isGameModeOpen);
  return useQuery<FollowRequestsResponse>({
    queryKey: queryKeys.profile.followRequests.list,
    queryFn: () => followRequestsApi.list(),
    enabled: isAuthenticated && enabled && !isGameModeOpen,
    staleTime: 1000 * 15,
  });
}

export function useFollowRequestsCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGameModeOpen = useSpotifyPlayerStore((s) => s.isGameModeOpen);
  return useQuery({
    queryKey: queryKeys.profile.followRequests.count,
    queryFn: () => followRequestsApi.count(),
    enabled: isAuthenticated && !isGameModeOpen,
    staleTime: 1000 * 30,
    refetchInterval: isGameModeOpen ? false : 1000 * 60,
  });
}

export function useRespondToFollowRequest() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.followRequests.root });
    queryClient.invalidateQueries({ queryKey: queryKeys.user.root });
  };

  const accept = useMutation({
    mutationFn: (followerId: string) => followRequestsApi.accept(followerId),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (followerId: string) => followRequestsApi.reject(followerId),
    onSuccess: invalidate,
  });

  return { accept, reject };
}
