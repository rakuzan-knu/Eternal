import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import type { ConversationView } from '../../../entities/chat/model/types';

export function useConversations() {
  const { isAuthenticated } = useAuthStore();

  return useQuery<ConversationView[]>({
    queryKey: [CONVERSATIONS_KEY],
    queryFn: chatApi.getConversations,
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });
}
