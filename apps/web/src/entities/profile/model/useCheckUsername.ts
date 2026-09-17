import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/userApi';
import { CHECK_USERNAME_KEY } from '@/shared/api/queryKeys';

export function useCheckUsername(username: string, enabled: boolean) {
  return useQuery({
    queryKey: [CHECK_USERNAME_KEY, username],
    queryFn: () => userApi.checkUsername(username),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
