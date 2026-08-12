import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SESSIONS_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { sessionsApi } from '../api/sessionsApi';

export function useSessions() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: [SESSIONS_KEY],
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
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
    },
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sessionsApi.revokeAllOthers(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
    },
  });
}
