import { useMemo } from 'react';
import { useNotificationStore, useUnreadCountsQuery } from '@/entities/notification';
import { useMusicHubStore } from '@/features/music/model/useMusicHubStore';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useUnreadNotificationsCount(): number {
  useUnreadCountsQuery();
  const backendTotal = useNotificationStore((state) => state.unreadCounts.total);
  const currentUserId = useAuthStore((state) => state.userId);
  const playlistInvites = useMusicHubStore((state) => state.playlistInvites || []);

  const pendingInvitesCount = useMemo(() => {
    if (!currentUserId) return 0;
    return playlistInvites.filter(
      (inv) => inv.status === 'pending' && inv.inviteeId === currentUserId,
    ).length;
  }, [playlistInvites, currentUserId]);

  return backendTotal + pendingInvitesCount;
}
