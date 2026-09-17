import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import type { UserSnapshot } from '../../../entities/chat/model/types';

/** Server State: blocked users list (per-user, 30s freshness). */
export function useBlockedUsers() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<UserSnapshot[]>({
    queryKey: queryKeys.conversations.blocked,
    queryFn: chatApi.getBlockedUsers,
    enabled: isAuthenticated,
    staleTime: queryStaleTimes.conversations,
  });
}
