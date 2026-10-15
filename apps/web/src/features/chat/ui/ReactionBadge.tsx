import React, { useState, useRef, useEffect } from 'react';
import type { ReactionSummary, UserSnapshot } from '../../../entities/chat/model/types';
import type { ChatThemeConfig } from '../model/chatTheme';
import { triggerReactionBurst } from '../lib/reactionBurstEngine';
import { getChatBackgroundLuminance } from '../lib/themeUtils';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import TelegramAppleEmoji from './Call/TelegramAppleEmoji';

interface ReactionBadgeProps {
  reaction: ReactionSummary;
  currentUserId: string | null;
  chatTheme?: ChatThemeConfig | null;
  onToggle: (emoji: string, currentSelfReacted: boolean, origin?: { x: number; y: number }) => void;
}

/**
 * Returns a Telegram-like vibrant gradient background for user initials
 */
function getAvatarGradient(seed: string): string {
  const gradients = [
    'bg-gradient-to-br from-indigo-500 to-purple-600',
    'bg-gradient-to-br from-blue-500 to-cyan-500',
    'bg-gradient-to-br from-emerald-500 to-teal-600',
    'bg-gradient-to-br from-amber-500 to-orange-600',
    'bg-gradient-to-br from-pink-500 to-rose-600',
    'bg-gradient-to-br from-violet-500 to-fuchsia-600',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return gradients[Math.abs(hash) % gradients.length];
}

interface ReactionBadgeAvatarProps {
  user: UserSnapshot;
  isSelf?: boolean;
  currentUser?: {
    avatar?: string | null;
    displayName?: string | null;
    username?: string | null;
  } | null;
  borderColorClass?: string;
  className?: string;
}

function ReactionBadgeAvatar({
  user,
  isSelf,
  currentUser,
  borderColorClass = 'border-black/50',
  className = '',
}: ReactionBadgeAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const avatarSrc =
    isSelf && !user.avatar && currentUser?.avatar ? currentUser.avatar : user.avatar;
  const rawName =
    isSelf && !user.displayName && !user.username
      ? currentUser?.displayName || currentUser?.username || 'You'
      : user.displayName || user.username || '';

  const initial = (rawName.trim()[0] || 'U').toUpperCase();
  const gradientClass = getAvatarGradient(user.id || rawName);

  return (
    <div
      className={`w-4.5 h-4.5 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border ${borderColorClass} shadow-xs select-none ${className}`}
      title={rawName}
    >
      {avatarSrc && !imgFailed ? (
        <img
          src={avatarSrc}
          alt={rawName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            setImgFailed(true);
          }}
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${gradientClass}`}>
          <span className="text-[9px] font-bold text-white uppercase leading-none">{initial}</span>
        </div>
      )}
    </div>
  );
}

export default function ReactionBadge({
  reaction,
  currentUserId,
  chatTheme,
  onToggle,
}: ReactionBadgeProps) {
  const [isTooltipOpen, setTooltipOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeRef = useRef<HTMLButtonElement | null>(null);
  const activeAccount = useAccountsStore((s) =>
    s.accounts.find((a) => a.id === (currentUserId || s.activeAccountId)),
  );
  const currentUser = activeAccount || null;

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setTooltipOpen(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setTooltipOpen(false);
    }, 150);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setTooltipOpen((prev) => !prev);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setTooltipOpen(false);

    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    setIsBouncing(true);
    if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    bounceTimeoutRef.current = setTimeout(() => setIsBouncing(false), 380);

    if (!reaction.selfReacted) {
      triggerReactionBurst(origin.x, origin.y, reaction.emoji);
    }

    onToggle(reaction.emoji, reaction.selfReacted, origin);
  };

  // Determine chat theme contrast (dark vs light background)
  const isLight = getChatBackgroundLuminance(chatTheme) > 0.45;

  let badgeColorClass = '';
  let avatarBorderClass = '';

  if (isLight) {
    if (reaction.selfReacted) {
      badgeColorClass =
        'bg-purple-500/20 hover:bg-purple-500/30 text-purple-900 border border-purple-500/50 shadow-[0_0_10px_rgba(147,51,234,0.18)]';
      avatarBorderClass = 'border-purple-300';
    } else {
      badgeColorClass =
        'bg-white/85 hover:bg-white/95 text-gray-900 border border-black/10 shadow-xs';
      avatarBorderClass = 'border-white';
    }
  } else {
    if (reaction.selfReacted) {
      badgeColorClass =
        'bg-purple-500/25 hover:bg-purple-500/35 text-purple-200 border border-purple-400/50 shadow-[0_2px_8px_rgba(168,85,247,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]';
      avatarBorderClass = 'border-purple-400/60';
    } else {
      badgeColorClass =
        'bg-[#181926]/95 hover:bg-[#222436] text-white/95 border border-white/12 shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]';
      avatarBorderClass = 'border-[#181926]';
    }
  }

  // Resolve users for avatars
  let avatarUsers = [...(reaction.users || [])];
  if (avatarUsers.length === 0 && reaction.selfReacted && currentUserId) {
    avatarUsers = [
      {
        id: currentUserId,
        username: currentUser?.username || '',
        displayName: currentUser?.displayName || currentUser?.username || 'You',
        avatar: currentUser?.avatar || null,
      },
    ];
  }

  // Telegram Display Rules:
  // 1-2 reactions -> purely user avatars, NO number!
  // If 2 reactions -> 2 overlapping avatars connected.
  // 3+ reactions -> NO avatars, clearly visible number only!
  const showAvatars = reaction.count <= 2 && avatarUsers.length > 0;
  const showCount = reaction.count >= 3 || (!showAvatars && reaction.count > 0);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={badgeRef}
        type="button"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`h-6.5 px-2 rounded-full flex items-center gap-1.5 text-xs font-semibold select-none cursor-pointer transition-all duration-200 active:scale-90 focus:outline-none ${
          isBouncing ? 'animate-reactionBounce' : 'animate-popIn'
        } ${badgeColorClass}`}
        title={`Reacted with ${reaction.emoji}. Click to ${reaction.selfReacted ? 'remove' : 'react'}`}
      >
        <TelegramAppleEmoji
          emoji={reaction.emoji}
          size={16}
          playAnimation={false}
          className="shrink-0 pointer-events-none"
        />

        {/* 1 or 2 reactions: Avatars (NO NUMBER) */}
        {showAvatars && (
          <div className="flex items-center -space-x-1.5 shrink-0">
            {avatarUsers.slice(0, 2).map((user, idx) => (
              <ReactionBadgeAvatar
                key={user.id || idx}
                user={user}
                isSelf={
                  user.id === currentUserId ||
                  (idx === 0 && reaction.selfReacted && avatarUsers.length === 1)
                }
                currentUser={currentUser}
                borderColorClass={avatarBorderClass}
                className={idx === 1 ? 'relative z-10' : 'relative z-0'}
              />
            ))}
          </div>
        )}

        {/* 3+ reactions: Clean high-contrast counter only (NO AVATARS) */}
        {showCount && (
          <span className="relative overflow-hidden h-4 inline-flex items-center font-bold text-[11px] leading-none tabular-nums px-0.5">
            <span key={reaction.count} className="animate-slideUp inline-block">
              {reaction.count}
            </span>
          </span>
        )}
      </button>

      {/* Hover Glass Popover Tooltip (300ms delay or right click) */}
      {isTooltipOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[160px] max-w-[260px] bg-[#0f0e17] border border-white/10 rounded-xl p-2 shadow-2xl animate-fadeIn pointer-events-auto select-none"
        >
          <div className="flex items-center gap-1.5 px-1.5 pb-1.5 border-b border-white/10 mb-1.5 text-[11px] font-semibold text-gray-300">
            <TelegramAppleEmoji
              emoji={reaction.emoji}
              size={16}
              playAnimation={false}
              className="shrink-0 pointer-events-none"
            />
            <span>
              {reaction.count} {reaction.count === 1 ? 'reaction' : 'reactions'}
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
            {reaction.users && reaction.users.length > 0 ? (
              reaction.users.map((user: UserSnapshot) => {
                const isSelf = user.id === currentUserId;
                const displayName = isSelf
                  ? user.displayName ||
                    currentUser?.displayName ||
                    user.username ||
                    currentUser?.username ||
                    'You'
                  : user.displayName || user.username || 'User';

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ReactionBadgeAvatar
                      user={user}
                      isSelf={isSelf}
                      currentUser={currentUser}
                      borderColorClass="border-white/10"
                    />
                    <span className="text-[11px] text-white/90 truncate font-medium flex-1">
                      {displayName}
                      {isSelf && (
                        <span className="text-purple-300 ml-1 text-[10px] font-semibold">
                          (You)
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="px-1.5 py-1 text-[11px] text-gray-400">
                {reaction.selfReacted ? 'You reacted' : `${reaction.count} people reacted`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
