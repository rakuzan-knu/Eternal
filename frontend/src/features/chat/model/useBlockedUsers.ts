import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { BLOCKED_USERS_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useBlockedUsers() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: [BLOCKED_USERS_KEY],
    queryFn: chatApi.getBlockedUsers,
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });
}
