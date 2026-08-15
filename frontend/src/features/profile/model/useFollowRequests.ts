import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FOLLOW_REQUESTS_KEY, USER_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { followRequestsApi } from '../api/followRequestsApi';

import type { FollowRequestUser } from '../model/privacyTypes';

export interface FollowRequestsResponse {
  data: FollowRequestUser[];
  meta: { nextCursor: string | null; hasNextPage: boolean };
}

export function useFollowRequests(enabled = true) {
  const { isAuthenticated } = useAuthStore();
  return useQuery<FollowRequestsResponse>({
    queryKey: [FOLLOW_REQUESTS_KEY, 'list'],
    queryFn: () => followRequestsApi.list(),
    enabled: isAuthenticated && enabled,
    staleTime: 1000 * 15,
  });
}

export function useFollowRequestsCount() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: [FOLLOW_REQUESTS_KEY, 'count'],
    queryFn: () => followRequestsApi.count(),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useRespondToFollowRequest() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [FOLLOW_REQUESTS_KEY] });
    queryClient.invalidateQueries({ queryKey: [USER_KEY] });
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
