import React, { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MessengerSidebar from '../../widgets/sidebar/ui/RailwaySidebar';
import ChatListPanel from '../../features/chat/ui/ChatListPanel';
import ChatThread from '../../features/chat/ui/ChatThread';
import { MessageThreadSkeleton } from '../../features/chat/ui/MessageListSkeletons';
import { useUIStore } from '../../shared/model/useUIStore';
import { queryKeys } from '../../shared/api/queryKeys';
import { queryStaleTimes } from '../../shared/api/queryClient';
import { useConversations } from '../../features/chat/model/useConversations';
import { usePresenceSync } from '../../features/chat/model/usePresence';
import { chatApi } from '../../features/chat/api/chatApi';

import type { ConversationView } from '../../entities/chat/model/types';
import { SEOHead } from '../../shared/seo';
import { recordRecentVisitedChat } from '../../features/chat/lib/recentVisitedChats';
import { ensureMessageIdentityRegistered } from '../../features/chat/lib/e2ee/messageE2ee';

export default function MessengerPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const previousConversation = useRef(conversationId);
  useEffect(() => {
    const returningConversation = !conversationId ? previousConversation.current : undefined;
    previousConversation.current = conversationId;
    if (!returningConversation || !workspaceRef.current) return;

    // A hidden virtual list mounts its rows after its viewport is measured.
    // Return focus when the real row is available, rather than losing the one attempt.
    const restoreFocus = () => {
      const button = document.getElementById(`conversation-${returningConversation}`);
      button?.focus({ preventScroll: true });
      if (button && document.activeElement === button) observer.disconnect();
    };
    const observer = new MutationObserver(restoreFocus);
    observer.observe(workspaceRef.current, { childList: true, subtree: true, attributes: true });
    restoreFocus();
    return () => observer.disconnect();
  }, [conversationId]);
  const isSidebarExpanded = useUIStore((s) => s.isSidebarExpanded);
  const { data: conversations, isLoading: isLoadingConversations } = useConversations();
  usePresenceSync();

  React.useEffect(() => {
    void ensureMessageIdentityRegistered();
  }, []);

  React.useEffect(() => {
    if (conversationId) {
      recordRecentVisitedChat(conversationId);
    }
  }, [conversationId]);

  const conversationInList =
    conversations?.find((c: ConversationView) => c.id === conversationId) ?? null;

  const { data: fetchedConversation, isLoading: isLoadingSingle } = useQuery({
    queryKey: conversationId
      ? queryKeys.conversations.detail(conversationId)
      : ['conversation', 'none'],
    queryFn: () => chatApi.getConversation(conversationId!),
    enabled: Boolean(conversationId),
    staleTime: queryStaleTimes.conversations,
    retry: 1,
  });

  const activeConversation = fetchedConversation || conversationInList || null;
  const isResolvingActiveChat =
    Boolean(conversationId) && !activeConversation && (isLoadingConversations || isLoadingSingle);

  const handleSelectConversation = (id: string) => navigate(`/messages/${id}`);

  return (
    <div ref={workspaceRef} className="fixed inset-0 flex bg-transparent overflow-hidden">
      <SEOHead
        title="Messages • Direct Chats on Eternal"
        description="Direct and group messaging on Eternal."
        noindex={true}
      />
      <div className="max-md:hidden">
        <MessengerSidebar />
      </div>

      <div
        className={`flex flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out max-md:ml-0 ${
          isSidebarExpanded ? 'ml-[220px]' : 'ml-16'
        }`}
      >
        <ChatListPanel
          onBack={() => navigate('/')}
          className={conversationId ? 'max-md:hidden' : 'max-md:w-full!'}
          onSelectConversation={handleSelectConversation}
          activeConversationId={conversationId ?? null}
        />

        <div className={`flex flex-1 min-w-0 flex-col ${conversationId ? '' : 'max-md:hidden'}`}>
          {conversationId && (
            <button
              type="button"
              onClick={() => navigate('/messages')}
              className="md:hidden min-h-11 px-4 flex items-center gap-2 text-sm text-gray-300 bg-[#16161a] border-b border-white/5"
            >
              <ArrowLeft size={18} aria-hidden="true" /> Back to chats
            </button>
          )}
          {isResolvingActiveChat ? (
            <div className="flex-1 flex flex-col justify-end gap-3 bg-[#0d111a]/40 py-5">
              <span className="sr-only">Loading conversation...</span>
              <MessageThreadSkeleton />
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
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-500 animate-fadeIn select-none">
              <MessageSquare size={40} />
              <p className="text-lg font-medium">Select a chat to start messaging</p>
              <a href="/search" className="text-sm font-medium hover:underline text-sky-400">
                Find friends
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
