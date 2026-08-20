import { useNotificationStore } from './useNotificationStore';
import { useUnreadCountsQuery } from './useNotifications';

export function useUnreadNotificationsCount(): number {
  useUnreadCountsQuery();
  return useNotificationStore((state) => state.unreadCounts.total);
}
