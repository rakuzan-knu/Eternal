import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/userApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { USER_KEY } from '@/shared/api/queryKeys';

export function useCurrentUser() {
  const { userId, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: [USER_KEY, userId],
    queryFn: () => {
      if (!userId) throw new Error('User not identified');
      return userApi.getProfile(userId);
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
