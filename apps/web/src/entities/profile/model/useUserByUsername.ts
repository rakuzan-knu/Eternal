import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/userApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes, queryGcTimes } from '@/shared/api/queryClient';

export function useUserByUsername(username?: string) {
  return useQuery({
    queryKey: queryKeys.user.byUsername(username ?? ''),
    queryFn: () => {
      if (!username) throw new Error('Username not specified');
      return userApi.getByUsername(username);
    },
    enabled: !!username,
    staleTime: queryStaleTimes.profile,
    gcTime: queryGcTimes.profile,
  });
}
