import React from 'react';
import { ArchiveRestore } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import GroupAvatarCollage from '@/shared/ui/GroupAvatarCollage';
import OnlineStatusIndicator from '@/shared/ui/OnlineStatusIndicator';
import { ConversationView } from '../../../entities/chat/model/types';
import { useArchiveConversation } from '../model/useConversationMutations';
import { getConversationDisplay, getMessagePreview } from '../lib/getConversationDisplay';

interface ArchivedListProps {
  conversations: ConversationView[];
  currentUserId: string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function ArchivedList({
  conversations,
  currentUserId,
  activeId,
  onSelect,
}: ArchivedListProps) {
  const archiveConversation = useArchiveConversation();

  return (
    <aside className="flex w-[300px] flex-shrink-0 flex-col overflow-y-auto custom-scrollbar bg-white/[0.02] p-2">
      {conversations.length === 0 && (
        <p className="mt-8 px-4 text-center text-sm text-gray-500">No archived chats</p>
      )}
      {conversations.map((c) => {
        const display = getConversationDisplay(c, currentUserId);
        const isActive = activeId === c.id;
        return (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`group relative flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
              isActive ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <div className="relative flex-shrink-0">
              {display.isGroup ? (
                display.avatar ? (
                  <Avatar size="md" src={display.avatar} />
                ) : (
                  <GroupAvatarCollage
                    avatars={c.participants.map((p) => p.user.avatar)}
                    size={40}
                  />
                )
              ) : (
                <>
                  <Avatar size="md" src={display.avatar} />
                  {display.otherUserId && (
                    <OnlineStatusIndicator userId={display.otherUserId} variant="dot" />
                  )}
                </>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-gray-100">{display.title}</p>
              <p className="truncate text-[13px] text-gray-500">{getMessagePreview(c)}</p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                archiveConversation.mutate({ conversationId: c.id, archived: false });
              }}
              title="Unarchive chat"
              aria-label="Unarchive chat"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100"
            >
              <ArchiveRestore size={16} />
            </button>
          </div>
        );
      })}
    </aside>
  );
}
