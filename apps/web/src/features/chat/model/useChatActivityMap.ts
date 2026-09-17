import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes, queryGcTimes } from '@/shared/api/queryClient';
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
    queryKey: conversationId
      ? queryKeys.conversations.activity(conversationId, year, month, timezone)
      : ['chat-activity-map', 'none', year, month, timezone],
    queryFn: () => {
      if (!conversationId) return Promise.resolve({});
      return chatApi.getChatActivity(conversationId, year, month, timezone);
    },
    enabled: Boolean(conversationId && year && month),
    staleTime: queryStaleTimes.profile,
    gcTime: queryGcTimes.profile,
  });

  return {
    activityMap: query.data || {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
