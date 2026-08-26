import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MessengerSidebar from '../../widgets/sidebar/ui/RailwaySidebar';
import ChatListPanel from '../../features/chat/ui/ChatListPanel';
import ChatThread from '../../features/chat/ui/ChatThread';
import { useUIStore } from '../../shared/model/useUIStore';
import { useConversations } from '../../features/chat/model/useConversations';
import { usePresenceSync } from '../../features/chat/model/usePresence';
import { chatApi } from '../../features/chat/api/chatApi';

import type { ConversationView } from '../../entities/chat/model/types';

export default function MessengerPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { isSidebarExpanded } = useUIStore();
  const { data: conversations, isLoading: isLoadingConversations } = useConversations();
  usePresenceSync();

  const conversationInList =
    conversations?.find((c: ConversationView) => c.id === conversationId) ?? null;

  const { data: fetchedConversation, isLoading: isLoadingSingle } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => chatApi.getConversation(conversationId!),
    enabled: Boolean(conversationId && !conversationInList),
    staleTime: 1000 * 30,
    retry: 1,
  });

  const activeConversation = conversationInList || fetchedConversation || null;
  const isResolvingActiveChat =
    Boolean(conversationId) && !activeConversation && (isLoadingConversations || isLoadingSingle);

  const handleSelectConversation = (id: string) => navigate(`/messages/${id}`);

  return (
    <div className="fixed inset-0 flex bg-[#0b0b0c] overflow-hidden">
      <MessengerSidebar />

      <div
        className={`flex flex-1 transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? 'ml-[200px]' : 'ml-16'
        }`}
      >
        <ChatListPanel
          onSelectConversation={handleSelectConversation}
          activeConversationId={conversationId ?? null}
        />

        {isResolvingActiveChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 bg-[#0d111a]/40">
            <Loader2 size={32} className="animate-spin text-sky-400" />
            <p className="text-sm font-medium text-gray-400">Loading conversation...</p>
          </div>
        ) : activeConversation ? (
          <ChatThread key={activeConversation.id} conversation={activeConversation} />
        ) : conversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500 bg-[#0d111a]/40">
            <MessageSquare size={40} className="text-gray-600" />
            <p className="text-lg font-medium text-white">Conversation not found</p>
            <p className="text-sm text-gray-400">
              This chat may have been deleted or is unavailable.
            </p>
            <button
              type="button"
              onClick={() => navigate('/messages')}
              className="mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium text-white transition-colors"
            >
              Back to messages
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-500">
            <MessageSquare size={40} />
            <p className="text-lg font-medium">Select a chat to start messaging</p>
            <a href="/search" className="text-sm font-medium hover:underline text-sky-400">
              Find friends
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
