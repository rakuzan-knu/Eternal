import React from 'react';
import { Phone, Video, Info } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import GroupAvatarCollage from '../../../shared/ui/GroupAvatarCollage';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import { ConversationDisplay } from '../lib/getConversationDisplay';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';

interface ChatThreadHeaderProps {
  display: ConversationDisplay;
  otherUserId: string | null;
  isOtherTyping: boolean;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  isGroup?: boolean;
  memberAvatars?: (string | null)[];
  memberCount?: number;
}

export default function ChatThreadHeader({
  display,
  otherUserId,
  isOtherTyping,
  isDetailsOpen,
  onToggleDetails,
  isGroup,
  memberAvatars = [],
  memberCount = 0,
}: ChatThreadHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 h-16 border-b border-white/5 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative">
          {isGroup ? (
            display.avatar ? (
              <Avatar size="sm" src={display.avatar} />
            ) : (
              <GroupAvatarCollage avatars={memberAvatars} size={36} />
            )
          ) : (
            <>
              <Avatar size="sm" src={display.avatar} />
              {otherUserId && <OnlineStatusIndicator userId={otherUserId} variant="dot" />}
            </>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{display.title}</p>
            {display.isVerified && <VerifiedCheckmark size="sm" />}
          </div>
          {isOtherTyping ? (
            <p className="text-[12px] truncate text-blue-400">Typing…</p>
          ) : isGroup ? (
            <p className="text-[12px] truncate text-gray-500">{memberCount} members</p>
          ) : (
            otherUserId && (
              <span className="flex items-center gap-1.5 min-w-0">
                <OnlineStatusIndicator
                  userId={otherUserId}
                  variant="dot"
                  className="static flex-shrink-0 !border-0 !w-2 !h-2"
                  showOfflineDot={false}
                />
                <OnlineStatusIndicator
                  userId={otherUserId}
                  variant="text"
                  className="text-[12px] truncate block"
                />
              </span>
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          title="Audio call"
          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Phone size={19} />
        </button>
        <button
          title="Video call"
          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Video size={19} />
        </button>
        <button
          onClick={onToggleDetails}
          title="Conversation info"
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
            isDetailsOpen
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Info size={19} />
        </button>
      </div>
    </div>
  );
}
