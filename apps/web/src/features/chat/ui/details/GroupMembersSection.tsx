import React from 'react';
import { Crown, ShieldCheck, UserPlus } from 'lucide-react';
import Avatar from '../../../../shared/ui/Avatar';
import OnlineStatusIndicator from '../../../../shared/ui/OnlineStatusIndicator';
import { ConversationView } from '../../../../entities/chat/model/types';

interface GroupMembersSectionProps {
  conversation: ConversationView;
  onAddMembers: () => void;
  onSelectMember: (userId: string) => void;
  onViewAll: () => void;
}

export default function GroupMembersSection({
  conversation,
  onAddMembers,
  onSelectMember,
  onViewAll,
}: GroupMembersSectionProps) {
  return (
    <>
      <div className="h-px bg-white/5 my-2" />
      <div className="flex items-center justify-between px-3 pt-1 pb-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {conversation.participants.length} participants
        </p>
        <button
          onClick={onAddMembers}
          title="Add more users"
          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <UserPlus size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto custom-scrollbar mb-1">
        {conversation.participants.slice(0, 5).map((p) => {
          const name = p.nickname ?? p.user.displayName ?? p.user.username;
          return (
            <button
              key={p.userId}
              onClick={() => onSelectMember(p.userId)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-left"
            >
              <div className="relative">
                <Avatar size="sm" src={p.user.avatar} />
                <OnlineStatusIndicator userId={p.userId} variant="dot" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{name}</p>
              </div>
              {(p.role === 'OWNER' || p.role === 'ADMIN') && (
                <span className="flex items-center gap-1 text-[11px] text-gray-500 flex-shrink-0">
                  {p.role === 'OWNER' ? (
                    <Crown size={12} className="text-yellow-500" />
                  ) : (
                    <ShieldCheck size={12} className="text-blue-400" />
                  )}
                  {p.role === 'OWNER' ? 'Owner' : 'Admin'}
                </span>
              )}
            </button>
          );
        })}
        {conversation.participants.length > 5 && (
          <button
            onClick={onViewAll}
            className="text-left px-3 py-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            View all {conversation.participants.length} participants
          </button>
        )}
      </div>
    </>
  );
}
