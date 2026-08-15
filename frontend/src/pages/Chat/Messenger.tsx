import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import MessengerSidebar from '../../widgets/sidebar/ui/RailwaySidebar';
import ChatListPanel from '../../features/chat/ui/ChatListPanel';
import ChatThread from '../../features/chat/ui/ChatThread';
import { useUIStore } from '../../shared/model/useUIStore';
import { useConversations } from '../../features/chat/model/useConversations';
import { usePresenceSync } from '../../features/chat/model/usePresence';

import type { ConversationView } from '../../entities/chat/model/types';

export default function MessengerPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { isSidebarExpanded } = useUIStore();
  const { data: conversations } = useConversations();
  usePresenceSync();

  const activeConversation =
    conversations?.find((c: ConversationView) => c.id === conversationId) ?? null;

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

        {activeConversation ? (
          <ChatThread key={activeConversation.id} conversation={activeConversation} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-500">
            <MessageSquare size={40} />
            <p className="text-lg font-medium">Select a chat to start messaging</p>
            <a href="/search" className="text-sm font-medium hover:underline">
              Find friends
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
