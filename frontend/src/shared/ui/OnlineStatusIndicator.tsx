import React from 'react';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useAuthStore } from '@/shared/model/useAuthStore';

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

  const isOnline = (isAuthenticated && currentUserId === userId) || isOnlineInStore;

  if (variant === 'text') {
    return (
      <span className={`${isOnline ? 'text-emerald-400' : 'text-gray-500'} ${className}`}>
        {isOnline ? 'Active now' : 'Offline'}
      </span>
    );
  }

  if (!isOnline && !showOfflineDot) return null;

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
