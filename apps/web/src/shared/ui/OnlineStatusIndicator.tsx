import React from 'react';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { DiscordGamepadIcon } from '@/shared/ui/BrandIcons';
import { Music } from 'lucide-react';

interface OnlineStatusIndicatorProps {
  userId: string;
  variant?: 'dot' | 'text';
  size?: 'sm' | 'md';
  className?: string;
  showOfflineDot?: boolean;
}

export default function OnlineStatusIndicator({
  userId,
  variant = 'dot',
  size = 'sm',
  className = '',
  showOfflineDot = true,
}: OnlineStatusIndicatorProps) {
  const currentUserId = useAuthStore((s) => s.userId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnlineInStore = usePresenceStore((s) => s.onlineUserIds.has(userId));
  const activity = usePresenceStore((s) => s.userActivities[userId]);

  const isOnline = (isAuthenticated && currentUserId === userId) || isOnlineInStore;
  const isGaming = Boolean(
    isOnline &&
    activity &&
    (activity.type === 'gaming' ||
      activity.type === 'game' ||
      activity.isSteam ||
      (activity.title && activity.type !== 'spotify')),
  );

  const isListeningSpotify = Boolean(
    isOnline &&
    !isGaming &&
    activity &&
    (activity.type === 'spotify' || Boolean(activity.trackId && !isGaming)),
  );

  if (variant === 'text') {
    if (isGaming) {
      return (
        <span
          className={`text-emerald-400 font-medium inline-flex items-center gap-1.5 ${className}`}
        >
          <DiscordGamepadIcon size={12} className="text-[#23a55a] shrink-0" />
          <span className="truncate">Playing {activity?.title}</span>
        </span>
      );
    }
    if (isListeningSpotify) {
      return (
        <span
          className={`text-[#1DB954] font-medium inline-flex items-center gap-1.5 ${className}`}
        >
          <Music size={12} className="text-[#1DB954] shrink-0" />
          <span className="truncate">Listening to {activity?.title}</span>
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

  if (isGaming) {
    const isStatic = className.includes('static');
    const iconSize = size === 'sm' ? 14 : 18;
    return (
      <span
        aria-label="Playing a game"
        title={`Playing ${activity?.title || 'game'}`}
        className={`${isStatic ? 'inline-flex' : 'absolute -bottom-1 -right-1 p-0.5 bg-[#16161a] rounded-full'} flex items-center justify-center pointer-events-none drop-shadow-[0_0_6px_rgba(35,165,90,0.85)] z-10 ${className}`}
      >
        <DiscordGamepadIcon size={isStatic ? 12 : iconSize} className="text-[#23a55a]" />
      </span>
    );
  }

  if (isListeningSpotify) {
    const isStatic = className.includes('static');
    const iconSize = size === 'sm' ? 13 : 16;
    const songDetails = activity?.subtitle || activity?.artist || '';
    return (
      <span
        aria-label="Listening to Spotify"
        title={`Listening to ${activity?.title || 'music'}${songDetails ? ` — ${songDetails}` : ''}`}
        className={`${isStatic ? 'inline-flex' : 'absolute -bottom-1 -right-1 p-0.5 bg-[#16161a] rounded-full'} flex items-center justify-center pointer-events-none drop-shadow-[0_0_6px_rgba(29,185,84,0.85)] z-10 ${className}`}
      >
        <Music size={isStatic ? 12 : iconSize} className="text-[#1DB954]" />
      </span>
    );
  }

  const dotSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <span
      aria-label={isOnline ? 'Online' : 'Offline'}
      title={isOnline ? 'Online' : 'Offline'}
      className={`absolute bottom-0 right-0 ${dotSize} rounded-full ${
        isOnline ? 'bg-emerald-500' : 'bg-gray-500'
      } border-2 border-[#16161a] ${className}`}
    />
  );
}
