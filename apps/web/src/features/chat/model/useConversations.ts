import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes, queryGcTimes } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import type { ConversationView } from '../../../entities/chat/model/types';

/**
 * Server State: conversation list. Freshness 30s; ordering/previews are
 * patched instantly via Socket.io `setQueryData` (see chatCacheSync).
 */
export function useConversations() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<ConversationView[]>({
    queryKey: queryKeys.conversations.root,
    queryFn: chatApi.getConversations,
    enabled: isAuthenticated,
    staleTime: queryStaleTimes.conversations,
    gcTime: queryGcTimes.default,
  });
}
