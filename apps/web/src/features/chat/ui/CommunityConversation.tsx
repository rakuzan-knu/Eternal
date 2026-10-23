import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/entities/chat';
import { queryKeys } from '@/shared/api/queryKeys';
import { useUIStore } from '@/shared/model/useUIStore';
import ChatThread from './ChatThread';

/** Only mount after the owning page has resolved active channel membership. */
export function CommunityConversation({
  communityId,
  communityName,
  conversationId,
  onClose,
  onSelectConversation,
}: {
  communityId: string;
  communityName?: string;
  conversationId: string;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
}) {
  const conversation = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId),
    queryFn: ({ signal }) => chatApi.getConversation(conversationId, signal),
    retry: false,
  });
  const valid =
    conversation.isSuccess &&
    conversation.data?.communityId === communityId &&
    conversation.data.type === 'GROUP';
  useEffect(() => {
    if (!valid) return;
    useUIStore.getState().setActiveConversationId(conversationId);
    return () => {
      if (useUIStore.getState().activeConversationId === conversationId)
        useUIStore.getState().setActiveConversationId(null);
    };
  }, [conversationId, valid]);
  if (conversation.isPending)
    return (
      <div className="community-workspace-state" role="status">
        Loading conversation…
      </div>
    );
  if (conversation.isError || !valid)
    return (
      <div className="community-workspace-state" role="alert">
        <h2>Conversation unavailable</h2>
        <p>Your access may have changed. Your other channels are still available.</p>
        <button className="community-action" onClick={() => void conversation.refetch()}>
          Try again
        </button>
        <button className="community-action" onClick={onClose}>
          Back to channels
        </button>
      </div>
    );
  return (
    <ChatThread
      communityName={communityName}
      key={conversationId}
      conversation={conversation.data}
      onClose={onClose}
      onSelectConversation={onSelectConversation}
    />
  );
}
