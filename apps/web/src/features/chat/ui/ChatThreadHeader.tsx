import React from 'react';
import { Phone, Video, Info, Radio, Search } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import GroupAvatarCollage from '../../../shared/ui/GroupAvatarCollage';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import { ConversationDisplay } from '../lib/getConversationDisplay';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import { useCallPrewarmer } from '../lib/webrtc/webrtcPrewarmer';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import {
  isMusicActivity,
  isGamingActivity,
  getActivityGameIcon,
  getActivityMusicCover,
  formatActivityText,
} from '../../../shared/ui/activityIcons';

interface ChatThreadHeaderProps {
  conversationId?: string;
  display: ConversationDisplay;
  otherUserId: string | null;
  isOtherTyping: boolean;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  isSearchOpen?: boolean;
  onToggleSearch?: () => void;
  isGroup?: boolean;
  memberAvatars?: (string | null)[];
  memberCount?: number;
  onStartCall?: (type: 'audio' | 'video') => void;
  onStartVoiceMesh?: () => void;
  isVoiceMeshActive?: boolean;
}

export default function ChatThreadHeader({
  conversationId: _conversationId,
  display,
  otherUserId,
  isOtherTyping,
  isDetailsOpen,
  onToggleDetails,
  isSearchOpen = false,
  onToggleSearch,
  isGroup,
  memberAvatars = [],
  memberCount = 0,
  onStartCall,
  onStartVoiceMesh,
  isVoiceMeshActive = false,
}: ChatThreadHeaderProps) {
  const callKey = otherUserId || 'default';
  const prewarmer = useCallPrewarmer(callKey);

  const otherActivity = usePresenceStore((s) =>
    otherUserId ? s.userActivities[otherUserId] : null,
  );
  const isOtherListening = Boolean(!isGroup && otherUserId && isMusicActivity(otherActivity));
  const isOtherGaming = Boolean(!isGroup && otherUserId && isGamingActivity(otherActivity));
  const formattedActivity = formatActivityText(otherActivity, 28, 18);

  return (
    <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 shrink-0 glass-panel z-10">
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
          ) : isOtherListening ? (
            <div
              className="flex items-center gap-1.5 min-w-0 text-[12px] text-gray-300 font-medium"
              title={`Listening to ${formattedActivity.fullText}`}
            >
              {getActivityMusicCover(otherActivity, 14)}
              <span className="truncate max-w-[280px] sm:max-w-[420px]">
                Listening to{' '}
                <span className="text-white font-semibold">{formattedActivity.title}</span>
                {formattedActivity.subtitle ? (
                  <span className="text-gray-400 font-normal"> — {formattedActivity.subtitle}</span>
                ) : null}
              </span>
            </div>
          ) : isOtherGaming ? (
            <div
              className="flex items-center gap-1.5 min-w-0 text-[12px] text-gray-300 font-medium"
              title={`Playing ${formattedActivity.fullText}`}
            >
              {getActivityGameIcon(otherActivity, 14)}
              <span className="truncate max-w-[280px] sm:max-w-[420px]">
                Playing <span className="text-white font-semibold">{formattedActivity.title}</span>
              </span>
            </div>
          ) : (
            otherUserId && (
              <OnlineStatusIndicator
                userId={otherUserId}
                variant="text"
                showIcon={false}
                className="text-[12px] truncate block"
              />
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onStartVoiceMesh && (
          <button
            type="button"
            onClick={onStartVoiceMesh}
            title={isVoiceMeshActive ? 'Voice Channel Active' : 'Join Voice Channel (Discord P2P)'}
            aria-label="Join Voice Channel"
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              isVoiceMeshActive
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:bg-white/5 hover:text-emerald-400'
            }`}
          >
            <Radio size={19} className={isVoiceMeshActive ? 'animate-pulse' : ''} />
          </button>
        )}

        <button
          onClick={() => {
            prewarmer.prewarmImmediately();
            onStartCall?.('audio');
          }}
          onMouseEnter={prewarmer.onMouseEnter}
          onMouseLeave={prewarmer.onMouseLeave}
          onTouchStart={prewarmer.onTouchStart}
          title="Audio call"
          aria-label="Start audio call"
          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Phone size={19} />
        </button>

        <button
          onClick={() => {
            prewarmer.prewarmImmediately();
            onStartCall?.('video');
          }}
          onMouseEnter={prewarmer.onMouseEnter}
          onMouseLeave={prewarmer.onMouseLeave}
          onTouchStart={prewarmer.onTouchStart}
          title="Video call"
          aria-label="Start video call"
          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Video size={19} />
        </button>

        {onToggleSearch && (
          <button
            onClick={onToggleSearch}
            title="Search messages (Ctrl+F)"
            aria-label="Search messages"
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              isSearchOpen
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Search size={18} />
          </button>
        )}

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
