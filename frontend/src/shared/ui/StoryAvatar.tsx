import React, { useContext } from 'react';
import Avatar from './Avatar';
import { useStoryViewerStore } from '@/features/stories/model/useStoryViewerStore';
import { QueryClientContext } from '@tanstack/react-query';
import { STORIES_FEED_KEY } from '@/shared/api/queryKeys';
import type { UserStoriesGroup } from '@/features/stories/model/types';

export interface StoryAvatarProps {
  src?: string | null;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  alt?: string;
  className?: string;
  name?: string;
  userId?: string;
  username?: string;
  hasStory?: boolean;
  hasUnviewed?: boolean;
  hasCloseFriendsStory?: boolean;
  interactive?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  showBadge?: boolean;
}

export default function StoryAvatar({
  src,
  size = 'md',
  alt = 'User avatar',
  className = '',
  name,
  userId,
  username,
  hasStory = false,
  hasUnviewed = false,
  hasCloseFriendsStory = false,
  interactive = true,
  onClick,
  showBadge = false,
}: StoryAvatarProps) {
  const openViewer = useStoryViewerStore((s) => s.openViewer);
  const queryClient = useContext(QueryClientContext);
  const feed = queryClient
    ? queryClient.getQueryData<UserStoriesGroup[]>([STORIES_FEED_KEY])
    : useStoryViewerStore.getState().groups;

  // If userId or username provided, check live feed if not explicitly passed
  let resolvedHasStory = hasStory;
  let resolvedHasUnviewed = hasUnviewed;
  let resolvedHasCloseFriends = hasCloseFriendsStory;

  if (feed && (userId || username)) {
    const userGroup = feed.find(
      (g) => (userId && g.user.id === userId) || (username && g.user.username === username),
    );
    if (userGroup && userGroup.stories.length > 0) {
      resolvedHasStory = true;
      resolvedHasUnviewed = userGroup.hasUnviewed;
      resolvedHasCloseFriends = userGroup.hasCloseFriendsStory;
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      return;
    }

    if (interactive && resolvedHasStory && feed) {
      e.stopPropagation();
      e.preventDefault();

      // Find user group in feed or open viewer with single group
      const groupIndex = feed.findIndex(
        (g) => (userId && g.user.id === userId) || (username && g.user.username === username),
      );

      if (groupIndex !== -1) {
        openViewer(feed, groupIndex);
      }
    }
  };

  const ringPaddingClasses: Record<string, string> = {
    '2xs': 'p-[1px]',
    xs: 'p-[1.5px]',
    sm: 'p-[2px]',
    md: 'p-[2.5px]',
    lg: 'p-[3px]',
    xl: 'p-[3.5px]',
    '2xl': 'p-[4px]',
  };

  // Border & Glow styling
  let containerRingClasses = '';
  let containerStyle: React.CSSProperties = {};

  if (resolvedHasStory) {
    if (resolvedHasUnviewed) {
      if (resolvedHasCloseFriends) {
        // Close friends neon green gradient
        containerStyle = {
          background: 'linear-gradient(135deg, #10b981 0%, #22c55e 50%, #14b8a6 100%)',
          filter: 'drop-shadow(0 0 7px rgba(16, 185, 129, 0.45))',
        };
        containerRingClasses = 'animate-pulse hover:scale-105 transition-all duration-300';
      } else {
        // Vibrant neon purple/pink/indigo gradient
        containerStyle = {
          background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #6366f1 100%)',
          filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.45))',
        };
        containerRingClasses = 'hover:scale-105 transition-all duration-300';
      }
    } else {
      // Subtle viewed ring
      containerRingClasses =
        'bg-white/20 border border-white/10 opacity-75 hover:opacity-100 transition-opacity';
    }
  }

  if (!resolvedHasStory) {
    return (
      <Avatar
        src={src}
        size={size === '2xl' ? 'xl' : size}
        alt={alt}
        className={className}
        name={name}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      style={containerStyle}
      className={`relative inline-flex items-center justify-center rounded-full ${
        ringPaddingClasses[size] || 'p-[2.5px]'
      } ${containerRingClasses} ${interactive ? 'cursor-pointer' : ''} ${className}`}
      title={
        resolvedHasStory
          ? resolvedHasUnviewed
            ? 'View active stories'
            : 'View watched stories'
          : undefined
      }
    >
      <div className="rounded-full bg-[#09090b] p-[1.5px] flex items-center justify-center overflow-hidden">
        <Avatar src={src} size={size === '2xl' ? 'xl' : size} alt={alt} name={name} />
      </div>

      {/* Optional Close Friends mini green star badge */}
      {showBadge && resolvedHasCloseFriends && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-[#09090b] rounded-full border-2 border-[#09090b] flex items-center justify-center text-[10px] font-black shadow-sm"
          title="Close Friends Story"
        >
          ★
        </div>
      )}
    </div>
  );
}
