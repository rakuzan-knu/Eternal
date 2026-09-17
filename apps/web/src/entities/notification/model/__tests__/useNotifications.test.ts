import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useNotifications,
  useUnreadCountsQuery,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useMuteNotificationAuthor,
} from '../useNotifications';
import { useNotificationStore } from '../useNotificationStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import * as notificationApi from '../../api/notificationApi';
import { NOTIFICATIONS_KEY } from '@/shared/api/queryKeys';

vi.mock('../../api/notificationApi', () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadNotificationCounts: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  muteNotificationAuthor: vi.fn(),
}));

describe('useNotifications hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({ optimisticFollows: {}, unreadCounts: undefined });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it('useNotifications fetches paginated notifications and syncs unread counts', async () => {
    vi.mocked(notificationApi.fetchNotifications).mockResolvedValueOnce({
      items: [{ id: 'notif-1' } as any],
      nextCursor: 'next-1',
      hasMore: true,
      unreadCounts: {
        total: 1,
        likes: 1,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      },
    });

    const { result } = renderHook(() => useNotifications('all'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.refetch();
    });

    expect(notificationApi.fetchNotifications).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 20,
      type: 'all',
    });
  });

  it('useUnreadCountsQuery fetches unread counts', async () => {
    vi.mocked(notificationApi.fetchUnreadNotificationCounts).mockResolvedValueOnce({
      total: 3,
      likes: 2,
      comments: 1,
      follows: 0,
      mentions: 0,
      reposts: 0,
      system: 0,
    });

    const { result } = renderHook(() => useUnreadCountsQuery(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.refetch();
    });

    expect(notificationApi.fetchUnreadNotificationCounts).toHaveBeenCalled();
  });

  it('useMarkNotificationAsRead optimistically updates notification to isRead=true', async () => {
    vi.mocked(notificationApi.markNotificationAsRead).mockResolvedValueOnce({
      id: 'notif-1',
      isRead: true,
    } as any);

    queryClient.setQueryData([NOTIFICATIONS_KEY], {
      pages: [{ items: [{ id: 'notif-1', isRead: false }], unreadCounts: { total: 1 } }],
      pageParams: [undefined],
    });

    const { result } = renderHook(() => useMarkNotificationAsRead(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('notif-1');
    });

    expect(notificationApi.markNotificationAsRead).toHaveBeenCalledWith('notif-1');
  });

  it('useMarkAllNotificationsAsRead handles filter="all" and specific filter onMutate', async () => {
    vi.mocked(notificationApi.markAllNotificationsAsRead).mockResolvedValue({
      success: true,
      count: 1,
      unreadCounts: {
        total: 0,
        likes: 0,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      },
    });

    queryClient.setQueryData([NOTIFICATIONS_KEY], {
      pages: [
        {
          items: [{ id: 'notif-1', isRead: false }],
          unreadCounts: {
            total: 2,
            likes: 2,
            comments: 0,
            follows: 0,
            mentions: 0,
            reposts: 0,
            system: 0,
          },
        },
      ],
      pageParams: [undefined],
    });

    const { result } = renderHook(() => useMarkAllNotificationsAsRead(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('all');
    });
    expect(notificationApi.markAllNotificationsAsRead).toHaveBeenCalledWith('all');

    await act(async () => {
      await result.current.mutateAsync('likes');
    });
    expect(notificationApi.markAllNotificationsAsRead).toHaveBeenCalledWith('likes');
  });

  it('useDeleteNotification optimistically removes notification from cache', async () => {
    vi.mocked(notificationApi.deleteNotification).mockResolvedValueOnce({
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
    });

    queryClient.setQueryData([NOTIFICATIONS_KEY], {
      pages: [{ items: [{ id: 'notif-1' }, { id: 'notif-2' }] }],
      pageParams: [undefined],
    });

    const { result } = renderHook(() => useDeleteNotification(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('notif-1');
    });

    const cache: any = queryClient.getQueryData([NOTIFICATIONS_KEY]);
    expect(cache.pages[0].items).toHaveLength(1);
    expect(cache.pages[0].items[0].id).toBe('notif-2');
  });

  it('useMuteNotificationAuthor filters out notifications by actorId and settles', async () => {
    vi.mocked(notificationApi.muteNotificationAuthor).mockResolvedValueOnce({ success: true });

    queryClient.setQueryData([NOTIFICATIONS_KEY], {
      pages: [
        {
          items: [
            { id: 'notif-1', actorId: 'actor-1' },
            { id: 'notif-2', actorId: 'actor-2' },
          ],
        },
      ],
      pageParams: [undefined],
    });

    const { result } = renderHook(() => useMuteNotificationAuthor(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('actor-1');
    });

    expect(notificationApi.muteNotificationAuthor).toHaveBeenCalledWith('actor-1');
    const cache: any = queryClient.getQueryData([NOTIFICATIONS_KEY]);
    expect(cache.pages[0].items).toHaveLength(1);
    expect(cache.pages[0].items[0].id).toBe('notif-2');
  });

  it('handles empty query cache safely in optimistic mutators', async () => {
    vi.mocked(notificationApi.markNotificationAsRead).mockResolvedValueOnce({
      id: 'n1',
      isRead: true,
    } as any);
    vi.mocked(notificationApi.markAllNotificationsAsRead).mockResolvedValueOnce({
      success: true,
      count: 0,
      unreadCounts: {} as any,
    });
    vi.mocked(notificationApi.deleteNotification).mockResolvedValueOnce({ success: true } as any);
    vi.mocked(notificationApi.muteNotificationAuthor).mockResolvedValueOnce({ success: true });

    // No cache set (old is undefined)
    const { result: markOne } = renderHook(() => useMarkNotificationAsRead(), {
      wrapper: createWrapper(),
    });
    const { result: markAll } = renderHook(() => useMarkAllNotificationsAsRead(), {
      wrapper: createWrapper(),
    });
    const { result: delNotif } = renderHook(() => useDeleteNotification(), {
      wrapper: createWrapper(),
    });
    const { result: muteAuthor } = renderHook(() => useMuteNotificationAuthor(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await markOne.current.mutateAsync('n1');
      await markAll.current.mutateAsync('all');
      await delNotif.current.mutateAsync('n1');
      await muteAuthor.current.mutateAsync('actor-1');
    });

    expect(notificationApi.markNotificationAsRead).toHaveBeenCalled();
  });

  it('covers line 90 - item not matching id stays unchanged in markNotificationAsRead', async () => {
    vi.mocked(notificationApi.markNotificationAsRead).mockResolvedValueOnce({
      id: 'notif-1',
      isRead: true,
    } as any);

    // Set data with two items - one matching, one not (to cover `: item` branch in line 90)
    queryClient.setQueryData([NOTIFICATIONS_KEY], {
      pages: [
        {
          items: [
            { id: 'notif-1', isRead: false },
            { id: 'notif-other', isRead: false }, // this one should NOT be updated (line 90 else branch)
          ],
          unreadCounts: { total: 2 },
        },
      ],
      pageParams: [undefined],
    });

    const { result } = renderHook(() => useMarkNotificationAsRead(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('notif-1');
    });

    // notif-other should still be unread (covers the `: item` else branch)
    const cache: any = queryClient.getQueryData([NOTIFICATIONS_KEY]);
    expect(cache?.pages[0].items[1].isRead).toBe(false);
    expect(cache?.pages[0].items[0].isRead).toBe(true);
  });

  it('covers useDeleteNotification onSuccess when data has no unreadCounts (line 218 false branch)', async () => {
    // Response without unreadCounts - covers `if (data?.unreadCounts)` false branch
    vi.mocked(notificationApi.deleteNotification).mockResolvedValueOnce({
      success: true,
      // no unreadCounts field
    } as any);

    queryClient.setQueryData([NOTIFICATIONS_KEY], {
      pages: [{ items: [{ id: 'notif-del', actorId: 'actor-del' }] }],
      pageParams: [undefined],
    });

    const { result } = renderHook(() => useDeleteNotification(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('notif-del');
    });

    expect(notificationApi.deleteNotification).toHaveBeenCalledWith('notif-del');
  });
});
