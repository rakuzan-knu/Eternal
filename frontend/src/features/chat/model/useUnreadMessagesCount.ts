import { useMemo } from 'react';
import { useConversations } from './useConversations';
import { useMessengerRealtime } from './useMessengerRealtime';

export function useUnreadMessagesCount(
  activeConversationId: string | null,
  options: { showPushNotifications?: boolean } = {},
) {
  const { data: conversations } = useConversations();
  const conversationIds = useMemo(() => conversations?.map((c) => c.id) ?? [], [conversations]);

  useMessengerRealtime(
    conversationIds,
    activeConversationId,
    options.showPushNotifications ?? false,
  );

  return useMemo(
    () =>
      conversations?.reduce((total, conversation) => {
        if (conversation.id === activeConversationId) return total;
        return total + conversation.unreadCount;
      }, 0) ?? 0,
    [activeConversationId, conversations],
  );
}
