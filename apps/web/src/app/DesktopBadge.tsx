import { useEffect } from 'react';
import { useUnreadMessagesCount } from '@/features/chat';
import { useNotificationStore, useUnreadCountsQuery } from '@/entities/notification';
import { getDesktopBridge } from '@/shared/lib/platform';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function DesktopBadge() {
  const userId = useAuthStore((state) => state.userId);
  const messageCount = useUnreadMessagesCount(null);
  const notificationCount = useNotificationStore((state) => state.unreadCounts.total);
  useUnreadCountsQuery();
  const count = Math.min(999999, Math.max(0, messageCount + notificationCount));
  useEffect(() => {
    const desktop = getDesktopBridge();
    if (desktop?.setBadgeCount) void desktop.setBadgeCount(count).catch(() => {});
  }, [count, userId]);
  return null;
}
