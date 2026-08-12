import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useConversations() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: [CONVERSATIONS_KEY],
    queryFn: chatApi.getConversations,
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });
}
