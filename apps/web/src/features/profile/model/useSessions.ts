import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { sessionsApi } from '../api/sessionsApi';

import type { SessionView } from '../model/privacyTypes';

/** Server State: active sessions list (short freshness — security data). */
export function useSessions() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<SessionView[]>({
    queryKey: queryKeys.profile.sessions,
    queryFn: sessionsApi.list,
    enabled: isAuthenticated,
    staleTime: 1000 * 15,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionsApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.sessions });
    },
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sessionsApi.revokeAllOthers(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.sessions });
    },
  });
}
