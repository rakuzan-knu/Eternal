import { useQuery } from '@tanstack/react-query';
import { followApi, FollowUserSummary } from '../api/followApi';
import { FRIENDS_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useFriends() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<FollowUserSummary[]>({
    queryKey: [FRIENDS_KEY],
    queryFn: () => followApi.getFriends(),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}
