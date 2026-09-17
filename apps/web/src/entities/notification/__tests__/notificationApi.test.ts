import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/shared/api/httpClient';
import {
  deleteNotification,
  fetchNotifications,
  fetchNotificationSettings,
  fetchUnreadNotificationCounts,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  muteNotificationAuthor,
  unmuteNotificationAuthor,
  updateNotificationSettings,
} from '../api/notificationApi';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('notificationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchNotifications calls GET /notifications with query parameters and handles errors gracefully', async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: {
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
      },
    });

    const result = await fetchNotifications({ limit: 10, cursor: 'cursor-1', type: 'likes' });

    expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
      params: { limit: 10, cursor: 'cursor-1', type: 'likes' },
    });
    expect(result.items).toEqual([]);

    // Test error catch
    (apiClient.get as any).mockRejectedValueOnce(new Error('Network error'));
    const fallbackResult = await fetchNotifications();
    expect(fallbackResult.items).toEqual([]);
    expect(fallbackResult.hasMore).toBe(false);
  });

  it('fetchUnreadNotificationCounts calls GET /notifications/unread-count and handles errors', async () => {
    const counts = {
      total: 3,
      likes: 2,
      comments: 1,
      follows: 0,
      mentions: 0,
      reposts: 0,
      system: 0,
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: counts });

    const result = await fetchUnreadNotificationCounts();

    expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count');
    expect(result).toEqual(counts);

    // Test error catch
    (apiClient.get as any).mockRejectedValueOnce(new Error('API error'));
    const fallbackCounts = await fetchUnreadNotificationCounts();
    expect(fallbackCounts.total).toBe(0);
  });

  it('markNotificationAsRead calls PATCH /notifications/:id/read', async () => {
    const mockItem = { id: 'notif-1', isRead: true };
    (apiClient.patch as any).mockResolvedValueOnce({ data: mockItem });

    const result = await markNotificationAsRead('notif-1');

    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/notif-1/read');
    expect(result).toEqual(mockItem);
  });

  it('markAllNotificationsAsRead calls PATCH /notifications/read-all with optional filter', async () => {
    const response = {
      success: true,
      count: 2,
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
    (apiClient.patch as any).mockResolvedValueOnce({ data: response });

    const result = await markAllNotificationsAsRead('all');

    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/read-all', null, {
      params: {},
    });
    expect(result).toEqual(response);

    (apiClient.patch as any).mockResolvedValueOnce({ data: response });
    await markAllNotificationsAsRead('likes');
    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/read-all', null, {
      params: { type: 'likes' },
    });
  });

  it('handles fetchNotificationSettings and updateNotificationSettings', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ data: { soundEnabled: true } });
    const settings = await fetchNotificationSettings();
    expect(settings).toEqual({ soundEnabled: true });

    (apiClient.patch as any).mockResolvedValueOnce({ data: { soundEnabled: false } });
    const updated = await updateNotificationSettings({ soundEnabled: false });
    expect(updated).toEqual({ soundEnabled: false });
  });

  it('deleteNotification calls DELETE /notifications/:id', async () => {
    const response = {
      success: true,
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
    (apiClient.delete as any).mockResolvedValueOnce({ data: response });

    const result = await deleteNotification('notif-1');

    expect(apiClient.delete).toHaveBeenCalledWith('/notifications/notif-1');
    expect(result).toEqual(response);
  });

  it('muteNotificationAuthor calls POST /notifications/mute-author/:actorId', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: { mutedActorIds: ['actor-1'] } });

    const result = await muteNotificationAuthor('actor-1');

    expect(apiClient.post).toHaveBeenCalledWith('/notifications/mute-author/actor-1');
    expect(result).toEqual({ mutedActorIds: ['actor-1'] });
  });

  it('unmuteNotificationAuthor calls DELETE /notifications/mute-author/:actorId', async () => {
    (apiClient.delete as any).mockResolvedValueOnce({ data: { mutedActorIds: [] } });

    const result = await unmuteNotificationAuthor('actor-1');

    expect(apiClient.delete).toHaveBeenCalledWith('/notifications/mute-author/actor-1');
    expect(result).toEqual({ mutedActorIds: [] });
  });
});
