import { useMemo } from 'react';
import { useConversations } from './useConversations';
import { useMessengerRealtime } from './useMessengerRealtime';
import type { ConversationView } from '../../../entities/chat/model/types';

export function useUnreadMessagesCount(
  activeConversationId: string | null,
  options: { showPushNotifications?: boolean } = {},
) {
  const { data: conversations } = useConversations();
  const conversationIds = useMemo(
    () => conversations?.map((c: ConversationView) => c.id) ?? [],
    [conversations],
  );

  useMessengerRealtime(
    conversationIds,
    activeConversationId,
    options.showPushNotifications ?? false,
  );

  return useMemo(
    () =>
      conversations?.reduce((total: number, conversation: ConversationView) => {
        if (conversation.id === activeConversationId) return total;
        return total + conversation.unreadCount;
      }, 0) ?? 0,
    [activeConversationId, conversations],
  );
}
