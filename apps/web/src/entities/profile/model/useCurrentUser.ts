import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/userApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useActiveDecorationStore } from '@/shared/model/useActiveDecorationStore';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes, queryGcTimes } from '@/shared/api/queryClient';

export function useCurrentUser() {
  const userId = useAuthStore((s) => s.userId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: queryKeys.user.current(userId),
    queryFn: () => {
      if (!userId) throw new Error('User not identified');
      return userApi.getProfile(userId);
    },
    enabled: isAuthenticated && !!userId,
    staleTime: queryStaleTimes.profile,
    gcTime: queryGcTimes.profile,
  });

  useEffect(() => {
    if (query.data) {
      useActiveDecorationStore.getState().syncUser(query.data);
    }
  }, [query.data]);

  return query;
}
