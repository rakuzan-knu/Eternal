import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/userApi';
import { USER_KEY, USER_BY_USERNAME_KEY } from '@/shared/api/queryKeys';

export function useUserByUsername(username?: string) {
  return useQuery({
    queryKey: [USER_KEY, USER_BY_USERNAME_KEY, username],
    queryFn: () => {
      if (!username) throw new Error('Username not specified');
      return userApi.getByUsername(username);
    },
    enabled: !!username,
    staleTime: 1000 * 60 * 5,
  });
}
