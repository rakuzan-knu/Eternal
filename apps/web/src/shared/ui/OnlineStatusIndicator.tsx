import React from 'react';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { DiscordGamepadIcon } from '@/shared/ui/BrandIcons';
import { Music } from 'lucide-react';
import {
  isMusicActivity,
  isGamingActivity,
  getActivityGameIcon,
  getActivityMusicCover,
  formatActivityText,
} from './activityIcons';

interface OnlineStatusIndicatorProps {
  userId: string;
  variant?: 'dot' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOfflineDot?: boolean;
  showIcon?: boolean;
}

export default function OnlineStatusIndicator({
  userId,
  variant = 'dot',
  size = 'sm',
  className = '',
  showOfflineDot = true,
  showIcon = true,
}: OnlineStatusIndicatorProps) {
  const currentUserId = useAuthStore((s) => s.userId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnlineInStore = usePresenceStore((s) => s.onlineUserIds.has(userId));
  const activity = usePresenceStore((s) => s.userActivities[userId]);

  const isOnline = (isAuthenticated && currentUserId === userId) || isOnlineInStore;
  const isListening = Boolean(isOnline && isMusicActivity(activity));
  const isGaming = Boolean(isOnline && isGamingActivity(activity));

  if (variant === 'text') {
    if (isListening) {
      const formatted = formatActivityText(activity, 24, 16);
      return (
        <span
          className={`text-[#1DB954] font-medium inline-flex items-center gap-1.5 ${className}`}
          title={`Listening to ${formatted.fullText}`}
        >
          {showIcon && getActivityMusicCover(activity, 13)}
          <span className="truncate max-w-[200px]">Listening to {formatted.title}</span>
        </span>
      );
    }
    if (isGaming) {
      const formatted = formatActivityText(activity, 24, 16);
      return (
        <span
          className={`text-emerald-400 font-medium inline-flex items-center gap-1.5 ${className}`}
          title={`Playing ${formatted.fullText}`}
        >
          {showIcon && getActivityGameIcon(activity, 13)}
          <span className="truncate max-w-[200px]">Playing {formatted.title}</span>
        </span>
      );
    }
    return (
      <span className={`${isOnline ? 'text-emerald-400' : 'text-gray-500'} ${className}`}>
        {isOnline ? 'Active now' : 'Offline'}
      </span>
    );
  }

  if (!isOnline && !showOfflineDot) return null;

  if (isListening) {
    const isStatic = className.includes('static');
    const iconSize = size === 'xl' ? 18 : size === 'lg' ? 16 : size === 'sm' ? 12 : 14;
    const badgePadding =
      size === 'xl'
        ? 'p-1.5 bottom-1 right-1'
        : size === 'lg'
          ? 'p-1 bottom-1 right-1'
          : 'p-0.5 -bottom-1 -right-1';
    const songDetails = activity?.subtitle || activity?.artist || '';
    return (
      <span
        aria-label="Listening to Spotify"
        title={`Listening to ${activity?.title || 'music'}${songDetails ? ` — ${songDetails}` : ''}`}
        className={`${isStatic ? 'inline-flex' : `absolute ${badgePadding} bg-[#16161a] rounded-full`} flex items-center justify-center pointer-events-none drop-shadow-[0_0_6px_rgba(29,185,84,0.85)] z-10 ${className}`}
      >
        <Music size={isStatic ? 12 : iconSize} className="text-[#1DB954]" />
      </span>
    );
  }

  if (isGaming) {
    const isStatic = className.includes('static');
    const iconSize = size === 'xl' ? 18 : size === 'lg' ? 16 : size === 'sm' ? 12 : 14;
    const badgePadding =
      size === 'xl'
        ? 'p-1.5 bottom-1 right-1'
        : size === 'lg'
          ? 'p-1 bottom-1 right-1'
          : 'p-0.5 -bottom-1 -right-1';
    return (
      <span
        aria-label="Playing a game"
        title={`Playing ${activity?.title || 'game'}`}
        className={`${isStatic ? 'inline-flex' : `absolute ${badgePadding} bg-[#16161a] rounded-full`} flex items-center justify-center pointer-events-none drop-shadow-[0_0_6px_rgba(35,165,90,0.85)] z-10 ${className}`}
      >
        <DiscordGamepadIcon size={isStatic ? 12 : iconSize} className="text-[#23a55a]" />
      </span>
    );
  }

  const dotSize =
    size === 'xl'
      ? 'w-6 h-6 border-[3px] bottom-1 right-1'
      : size === 'lg'
        ? 'w-5 h-5 border-[2.5px] bottom-1 right-1'
        : size === 'sm'
          ? 'w-3 h-3 border-2 bottom-0 right-0'
          : 'w-3.5 h-3.5 border-2 bottom-0 right-0';

  return (
    <span
      aria-label={isOnline ? 'Online' : 'Offline'}
      title={isOnline ? 'Online' : 'Offline'}
      className={`absolute ${dotSize} rounded-full ${
        isOnline ? 'bg-emerald-500' : 'bg-gray-500'
      } border-[#16161a] ${className}`}
    />
  );
}
