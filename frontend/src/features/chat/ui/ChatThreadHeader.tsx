import React from 'react';
import { Phone, Video, Info, Music } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import GroupAvatarCollage from '../../../shared/ui/GroupAvatarCollage';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import { ConversationDisplay } from '../lib/getConversationDisplay';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { DiscordGamepadIcon } from '@/shared/ui/BrandIcons';

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
  const otherActivity = usePresenceStore((s) =>
    otherUserId ? s.userActivities[otherUserId] : null,
  );
  const isOtherGaming = Boolean(
    !isGroup &&
    otherUserId &&
    otherActivity &&
    (otherActivity.type === 'gaming' ||
      otherActivity.type === 'game' ||
      otherActivity.isSteam ||
      (otherActivity.title && otherActivity.type !== 'spotify')),
  );

  const isOtherListening = Boolean(
    !isGroup &&
    !isOtherGaming &&
    otherUserId &&
    otherActivity &&
    (otherActivity.type === 'spotify' || Boolean(otherActivity.trackId)),
  );

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
            <VerifiedCheckmark
              isVerified={display.isVerified}
              primaryBadge={display.primaryBadge}
              size="sm"
            />
          </div>
          {isOtherTyping ? (
            <p className="text-[12px] truncate text-blue-400">Typing…</p>
          ) : isGroup ? (
            <p className="text-[12px] truncate text-gray-500">{memberCount} members</p>
          ) : isOtherGaming ? (
            <div className="flex items-center gap-1.5 min-w-0 text-[12px] text-gray-300 font-medium">
              <DiscordGamepadIcon
                size={13}
                className="text-[#23a55a] shrink-0 drop-shadow-[0_0_4px_rgba(35,165,90,0.6)]"
              />
              <span className="truncate">
                Playing <span className="text-white font-semibold">{otherActivity?.title}</span>
              </span>
            </div>
          ) : isOtherListening ? (
            <div className="flex items-center gap-1.5 min-w-0 text-[12px] text-gray-300 font-medium">
              <Music
                size={13}
                className="text-[#1DB954] shrink-0 drop-shadow-[0_0_4px_rgba(29,185,84,0.6)]"
              />
              <span className="truncate">
                Listening to{' '}
                <span className="text-white font-semibold">{otherActivity?.title}</span>
                {otherActivity?.subtitle || otherActivity?.artist ? (
                  <span className="text-gray-400 font-normal">
                    {' '}
                    — {otherActivity.subtitle || otherActivity.artist}
                  </span>
                ) : null}
              </span>
            </div>
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
