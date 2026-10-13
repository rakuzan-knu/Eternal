import type {
  NotificationFilterType,
  NotificationResponseDto,
  NotificationUnreadCountsDto,
  PaginatedNotificationsResponseDto,
} from '@social-network/shared-contracts';
import { getMobileApi } from '@/shared/api/client';

export const notificationsApi = {
  list: async (type: NotificationFilterType, cursor: string | undefined, signal: AbortSignal) =>
    (
      await getMobileApi().get<PaginatedNotificationsResponseDto>('/notifications', {
        params: { type, cursor, limit: 20 },
        signal,
      })
    ).data,
  unread: async (signal: AbortSignal) =>
    (
      await getMobileApi().get<NotificationUnreadCountsDto>('/notifications/unread-count', {
        signal,
      })
    ).data,
  read: async (id: string) =>
    (
      await getMobileApi().patch<NotificationResponseDto>(
        `/notifications/${encodeURIComponent(id)}/read`,
      )
    ).data,
  readAll: async (type: NotificationFilterType) =>
    (
      await getMobileApi().patch<{
        success: boolean;
        count: number;
        unreadCounts: NotificationUnreadCountsDto;
      }>('/notifications/read-all', undefined, { params: { type } })
    ).data,
  delete: async (id: string) =>
    (
      await getMobileApi().delete<{ success: boolean; unreadCounts: NotificationUnreadCountsDto }>(
        `/notifications/${encodeURIComponent(id)}`,
      )
    ).data,
};
