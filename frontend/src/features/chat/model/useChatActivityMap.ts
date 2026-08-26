import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import type { ChatActivityMap } from '../../../entities/chat/model/types';

export interface UseChatActivityMapParams {
  year: number;
  month: number; // 1-indexed (1..12)
}

export function useChatActivityMap(
  conversationId: string | null,
  currentMonth: UseChatActivityMapParams,
) {
  const { year, month } = currentMonth;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const query = useQuery<ChatActivityMap>({
    queryKey: ['chat-activity-map', conversationId, year, month, timezone],
    queryFn: () => {
      if (!conversationId) return Promise.resolve({});
      return chatApi.getChatActivity(conversationId, year, month, timezone);
    },
    enabled: Boolean(conversationId && year && month),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 30, // 30 minutes in memory
  });

  return {
    activityMap: query.data || {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
