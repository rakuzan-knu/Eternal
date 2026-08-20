import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/shared/api/httpClient';
import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadNotificationCounts,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  muteNotificationAuthor,
  unmuteNotificationAuthor,
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

  it('fetchNotifications calls GET /notifications with query parameters', async () => {
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
  });

  it('fetchUnreadNotificationCounts calls GET /notifications/unread-count', async () => {
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
  });

  it('markNotificationAsRead calls PATCH /notifications/:id/read', async () => {
    const mockItem = { id: 'notif-1', isRead: true };
    (apiClient.patch as any).mockResolvedValueOnce({ data: mockItem });

    const result = await markNotificationAsRead('notif-1');

    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/notif-1/read');
    expect(result).toEqual(mockItem);
  });

  it('markAllNotificationsAsRead calls PATCH /notifications/read-all', async () => {
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

    const result = await markAllNotificationsAsRead('likes');

    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/read-all', null, {
      params: { type: 'likes' },
    });
    expect(result).toEqual(response);
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
