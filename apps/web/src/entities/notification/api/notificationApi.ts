import { apiClient as api } from '@/shared/api/httpClient';
import {
  NotificationFilter,
  NotificationItem,
  NotificationUnreadCounts,
  PaginatedNotificationsResponse,
} from '../model/types';

export interface GetNotificationsParams {
  limit?: number;
  cursor?: string;
  type?: NotificationFilter;
}

export async function fetchNotifications(
  params: GetNotificationsParams = {},
): Promise<PaginatedNotificationsResponse> {
  const queryParams: Record<string, string | number> = {};
  if (params.limit) queryParams.limit = params.limit;
  if (params.cursor) queryParams.cursor = params.cursor;
  if (params.type && params.type !== 'all') queryParams.type = params.type;

  try {
    const { data } = await api.get<PaginatedNotificationsResponse>('/notifications', {
      params: queryParams,
    });
    return data;
  } catch {
    return {
      items: [],
      nextCursor: null,
      hasMore: false,
      unreadCounts: {
        total: 0,
        likes: 0,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      },
    };
  }
}

export async function fetchUnreadNotificationCounts(): Promise<NotificationUnreadCounts> {
  try {
    const { data } = await api.get<NotificationUnreadCounts>('/notifications/unread-count');
    return data;
  } catch {
    return {
      total: 0,
      likes: 0,
      comments: 0,
      follows: 0,
      mentions: 0,
      reposts: 0,
      system: 0,
    };
  }
}

export async function markNotificationAsRead(id: string): Promise<NotificationItem> {
  const { data } = await api.patch<NotificationItem>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsAsRead(
  type?: NotificationFilter,
): Promise<{ success: boolean; count: number; unreadCounts: NotificationUnreadCounts }> {
  const queryParams: Record<string, string> = {};
  if (type && type !== 'all') queryParams.type = type;

  const { data } = await api.patch<{
    success: boolean;
    count: number;
    unreadCounts: NotificationUnreadCounts;
  }>('/notifications/read-all', null, {
    params: queryParams,
  });
  return data;
}

export async function fetchNotificationSettings(): Promise<Record<string, any>> {
  const { data } = await api.get<Record<string, any>>('/notifications/settings');
  return data;
}

export async function updateNotificationSettings(
  settings: Record<string, any>,
): Promise<Record<string, any>> {
  const { data } = await api.patch<Record<string, any>>('/notifications/settings', settings);
  return data;
}

export async function deleteNotification(
  id: string,
): Promise<{ success: boolean; unreadCounts: NotificationUnreadCounts }> {
  const { data } = await api.delete<{ success: boolean; unreadCounts: NotificationUnreadCounts }>(
    `/notifications/${id}`,
  );
  return data;
}

export async function muteNotificationAuthor(actorId: string): Promise<Record<string, any>> {
  const { data } = await api.post<Record<string, any>>(`/notifications/mute-author/${actorId}`);
  return data;
}

export async function unmuteNotificationAuthor(actorId: string): Promise<Record<string, any>> {
  const { data } = await api.delete<Record<string, any>>(`/notifications/mute-author/${actorId}`);
  return data;
}
