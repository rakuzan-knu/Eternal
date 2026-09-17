import React, { useState, useRef, useEffect } from 'react';
import type { ReactionSummary, UserSnapshot } from '../../../entities/chat/model/types';
import { triggerReactionBurst } from '../lib/reactionBurstEngine';
import Avatar from '../../../shared/ui/Avatar';

interface ReactionBadgeProps {
  reaction: ReactionSummary;
  currentUserId: string | null;
  onToggle: (emoji: string, currentSelfReacted: boolean, origin?: { x: number; y: number }) => void;
}

export default function ReactionBadge({ reaction, currentUserId, onToggle }: ReactionBadgeProps) {
  const [isTooltipOpen, setTooltipOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeRef = useRef<HTMLButtonElement | null>(null);

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
    // If tooltip is open, close it on click
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

  // Up to 3 user avatars to show inside the badge
  const previewUsers = (reaction.users || []).slice(0, 3);
  const hasPreviewUsers = previewUsers.length > 0;

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
        className={`h-6 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-semibold select-none cursor-pointer transition-all duration-200 active:scale-90 focus:outline-none ${
          isBouncing ? 'animate-reactionBounce' : 'animate-popIn'
        } ${
          reaction.selfReacted
            ? 'bg-purple-500/25 hover:bg-purple-500/35 text-purple-200 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
            : 'bg-white/[0.07] hover:bg-white/[0.12] text-white/80 border border-white/5'
        }`}
        title={`Reacted with ${reaction.emoji}. Click to ${reaction.selfReacted ? 'remove' : 'react'}`}
      >
        <span className="text-sm leading-none">{reaction.emoji}</span>

        {/* Telegram-style mini avatars inside the badge */}
        {hasPreviewUsers && (
          <div className="flex items-center -space-x-1.5">
            {previewUsers.map((user, idx) => (
              <div
                key={user.id || idx}
                className="w-4 h-4 rounded-full border border-black/60 overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.displayName || user.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-[9px] font-bold text-white/90 uppercase leading-none">
                    {(user.displayName || user.username || '?')[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Animated Spring Counter */}
        <span className="relative overflow-hidden h-4 inline-flex items-center font-semibold text-[11px] leading-none">
          <span key={reaction.count} className="animate-slideUp inline-block">
            {reaction.count}
          </span>
        </span>
      </button>

      {/* Hover Glass Popover Tooltip (300ms delay or right click) */}
      {isTooltipOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[150px] max-w-[240px] bg-[#0f0e17]/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl animate-fadeIn pointer-events-auto select-none"
        >
          <div className="flex items-center gap-1.5 px-1.5 pb-1.5 border-b border-white/10 mb-1.5 text-[11px] font-semibold text-gray-300">
            <span className="text-sm">{reaction.emoji}</span>
            <span>
              {reaction.count} {reaction.count === 1 ? 'reaction' : 'reactions'}
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
            {reaction.users && reaction.users.length > 0 ? (
              reaction.users.map((user: UserSnapshot) => {
                const isSelf = user.id === currentUserId;
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <Avatar size="2xs" src={user.avatar} name={user.displayName || user.username} />
                    <span className="text-[11px] text-white/90 truncate font-medium flex-1">
                      {user.displayName || user.username}
                      {isSelf && <span className="text-purple-300 ml-1 text-[10px]">(You)</span>}
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
