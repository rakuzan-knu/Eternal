import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/shared/api/socket';
import { NOTIFICATIONS_KEY, UNREAD_NOTIFICATIONS_COUNT_KEY } from '@/shared/api/queryKeys';
import {
  NotificationFilter,
  NotificationItem,
  NotificationType,
  NotificationUnreadCounts,
  PaginatedNotificationsResponse,
} from './types';
import { useNotificationStore } from './useNotificationStore';
import { useNotificationSettingsStore } from './useNotificationSettingsStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { playMessageNotificationSound } from '../lib/messageNotificationSound';
import { showBrowserPushNotification } from '@/shared/lib/browserPushNotifications';

function mapTypeToCategory(type: NotificationType): NotificationFilter {
  switch (type) {
    case 'LIKE_POST':
    case 'LIKE_COMMENT':
      return 'likes';
    case 'COMMENT':
      return 'comments';
    case 'FOLLOW':
      return 'follows';
    case 'MENTION':
      return 'mentions';
    case 'REPOST':
      return 'reposts';
    case 'SYSTEM_VERIFIED':
    case 'SYSTEM_VIEW':
    case 'SYSTEM':
    default:
      return 'system';
  }
}

export function useNotificationRealtime() {
  const queryClient = useQueryClient();
  const setUnreadCounts = useNotificationStore((state) => state.setUnreadCounts);

  useEffect(() => {
    const socket = getSocket();

    const handleNewNotification = (payload: {
      notification: NotificationItem;
      unreadCounts?: NotificationUnreadCounts;
    }) => {
      if (!payload?.notification) return;

      const notif = payload.notification;
      const settings = useNotificationSettingsStore.getState();

      if (payload.unreadCounts) {
        setUnreadCounts(payload.unreadCounts);
      }

      const isDndActive = Boolean(
        settings.dndUntil && new Date(settings.dndUntil).getTime() > Date.now(),
      );
      const isAuthorMuted = Boolean(
        notif.actorId && settings.mutedActorIds?.includes(notif.actorId),
      );

      const targetFilter = mapTypeToCategory(notif.type);
      const isCategoryEnabled =
        targetFilter === 'likes'
          ? settings.likes
          : targetFilter === 'comments'
            ? settings.comments
            : targetFilter === 'follows'
              ? settings.followers
              : targetFilter === 'mentions'
                ? settings.mentions
                : targetFilter === 'reposts'
                  ? settings.reposts
                  : settings.system;

      const shouldNotify =
        settings.enableNotifications && !isDndActive && !isAuthorMuted && isCategoryEnabled;

      if (shouldNotify) {
        // 1. Safe audio playback (if sound enabled)
        if (settings.allowSound) {
          try {
            playMessageNotificationSound(settings.volume);
          } catch {
            // Suppress autoplay policy error
          }
        }

        const actorName = notif.actor?.displayName || notif.actor?.username || 'Someone';
        const toastTitle = settings.showName ? actorName : 'Eternal';
        const toastBody = settings.showText ? notif.actionText : 'You have a new notification';
        const toastAvatar = settings.showName ? notif.actor?.avatar || null : null;

        // 2. In-app Push Notification (Apple iOS Liquid Glass toast)
        useMessageToastStore.getState().addToast({
          id: `notif-${notif.id}-${Date.now()}`,
          conversationId: '',
          messageId: notif.id,
          title: toastTitle,
          body: toastBody,
          avatar: toastAvatar,
          memberAvatars: [],
          isGroup: false,
          linkUrl: notif.deepLink || '/notifications',
        });

        // 3. Native OS Browser Push Notification (when tab is minimized or hidden)
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          showBrowserPushNotification({
            title: toastTitle,
            body: toastBody,
            icon: toastAvatar,
            url: notif.deepLink || '/notifications',
            tag: notif.id,
          }).catch(() => {});
        }
      }

      const updatePages = (
        old:
          | {
              pages: PaginatedNotificationsResponse[];
              pageParams: (string | undefined)[];
            }
          | undefined,
      ) => {
        if (!old || !old.pages || old.pages.length === 0) return old;

        // Check if notification already exists in cache (e.g. updated aggregated item)
        let found = false;
        const newPages = old.pages.map((page, idx) => {
          const itemExists = page.items.some((i) => i.id === notif.id);
          if (itemExists) {
            found = true;
            return {
              ...page,
              items: page.items.map((i) => (i.id === notif.id ? notif : i)),
            };
          }
          if (idx === 0 && !found) {
            return {
              ...page,
              items: [notif, ...page.items],
            };
          }
          return page;
        });

        if (!found && newPages[0] && !newPages[0].items.some((i) => i.id === notif.id)) {
          newPages[0] = {
            ...newPages[0],
            items: [notif, ...newPages[0].items],
          };
        }

        return {
          ...old,
          pages: newPages,
        };
      };

      queryClient.setQueriesData<{
        pages: PaginatedNotificationsResponse[];
        pageParams: (string | undefined)[];
      }>({ queryKey: [NOTIFICATIONS_KEY, 'all'] }, updatePages);

      if (targetFilter !== 'all') {
        queryClient.setQueriesData<{
          pages: PaginatedNotificationsResponse[];
          pageParams: (string | undefined)[];
        }>({ queryKey: [NOTIFICATIONS_KEY, targetFilter] }, updatePages);
      }

      queryClient.invalidateQueries({ queryKey: [UNREAD_NOTIFICATIONS_COUNT_KEY] });
    };

    const handleReadNotification = (payload: {
      notificationId?: string;
      allRead?: boolean;
      filterType?: string;
      unreadCounts?: NotificationUnreadCounts;
    }) => {
      if (payload?.unreadCounts) {
        setUnreadCounts(payload.unreadCounts);
      }

      if (payload?.allRead) {
        queryClient.setQueriesData<{
          pages: PaginatedNotificationsResponse[];
          pageParams: (string | undefined)[];
        }>({ queryKey: [NOTIFICATIONS_KEY] }, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => ({ ...item, isRead: true })),
            })),
          };
        });
      } else if (payload?.notificationId) {
        const id = payload.notificationId;
        queryClient.setQueriesData<{
          pages: PaginatedNotificationsResponse[];
          pageParams: (string | undefined)[];
        }>({ queryKey: [NOTIFICATIONS_KEY] }, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
            })),
          };
        });
      }

      queryClient.invalidateQueries({ queryKey: [UNREAD_NOTIFICATIONS_COUNT_KEY] });
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', handleReadNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:read', handleReadNotification);
    };
  }, [queryClient, setUnreadCounts]);
}
