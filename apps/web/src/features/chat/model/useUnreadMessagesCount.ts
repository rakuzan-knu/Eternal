import { useQuery } from '@tanstack/react-query';
import { useConversations } from './useConversations';
import { chatApi } from '../api/chatApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useUnreadMessagesCount(
  activeConversationId: string | null,
  _options: { showPushNotifications?: boolean } = {},
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // A badge observes cached metadata, but never fetches the conversation list.
  const { data: conversations } = useConversations({ enabled: false });
  const { data } = useQuery({
    queryKey: queryKeys.conversations.unreadCount,
    queryFn: ({ signal }) => chatApi.getUnreadCount(signal),
    enabled: isAuthenticated,
    staleTime: queryStaleTimes.counters,
    refetchOnWindowFocus: false,
  });
  // The scalar includes every dialog. Paged metadata cannot reconstruct it;
  // realtime events update/invalidate the scalar independently of loaded pages.
  const active = conversations?.find((c) => c.id === activeConversationId);
  return Math.max(
    0,
    (data?.count ?? 0) - (active && !active.isArchived ? Math.max(0, active.unreadCount || 0) : 0),
  );
}
