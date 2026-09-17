import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotificationRealtime } from '../useNotificationRealtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { getSocket } from '@/shared/api/socket';
import { useNotificationSettingsStore } from '../useNotificationSettingsStore';
import { useNotificationStore } from '../useNotificationStore';
import { playMessageNotificationSound } from '../../lib/messageNotificationSound';
import { showBrowserPushNotification } from '@/shared/lib/browserPushNotifications';
import { NOTIFICATIONS_KEY } from '@/shared/api/queryKeys';
import type { NotificationItem } from '../types';

vi.mock('@/shared/api/socket', () => ({
  getSocket: vi.fn(),
}));

vi.mock('../../lib/messageNotificationSound', () => ({
  playMessageNotificationSound: vi.fn(),
}));

vi.mock('@/shared/lib/browserPushNotifications', () => ({
  showBrowserPushNotification: vi.fn().mockResolvedValue(undefined),
}));

describe('useNotificationRealtime', () => {
  let queryClient: QueryClient;
  let socketListeners: Record<string, (...args: any[]) => void>;
  let mockSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    socketListeners = {};
    mockSocket = {
      on: vi.fn((event: string, cb: (...args: any[]) => void) => {
        socketListeners[event] = cb;
      }),
      off: vi.fn((event: string, _cb: (...args: any[]) => void) => {
        delete socketListeners[event];
      }),
    };
    (getSocket as any).mockReturnValue(mockSocket);

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    useNotificationSettingsStore.setState({
      enableNotifications: true,
      allowSound: true,
      volume: 0.8,
      dndUntil: null,
      mutedActorIds: [],
      showName: true,
      showText: true,
    });

    useNotificationStore.setState({
      unreadCounts: {
        total: 0,
        likes: 0,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      },
      activeFilter: 'all',
      optimisticFollows: {},
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  const sampleNotif: NotificationItem = {
    id: 'notif-1',
    userId: 'u1',
    actorId: 'actor-1',
    type: 'LIKE_POST',
    extraCount: 0,
    actionText: 'liked your post',
    deepLink: '/post/123',
    isRead: false,
    createdAt: new Date().toISOString(),
    actor: {
      id: 'actor-1',
      username: 'johndoe',
      displayName: 'John Doe',
      avatar: 'https://avatar.png',
      isVerified: false,
    },
  };

  it('subscribes to socket events on mount and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useNotificationRealtime(), {
      wrapper: createWrapper(),
    });

    expect(mockSocket.on).toHaveBeenCalledWith('notification:new', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('notification:read', expect.any(Function));

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('notification:new', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('notification:read', expect.any(Function));
  });

  it('handles notification:new, plays sound, updates unread counts and queries cache', () => {
    renderHook(() => useNotificationRealtime(), { wrapper: createWrapper() });

    queryClient.setQueryData([NOTIFICATIONS_KEY, 'all'], {
      pages: [{ items: [], nextCursor: null, hasMore: false, unreadCounts: {} }],
      pageParams: [undefined],
    });
    queryClient.setQueryData([NOTIFICATIONS_KEY, 'likes'], {
      pages: [{ items: [], nextCursor: null, hasMore: false, unreadCounts: {} }],
      pageParams: [undefined],
    });

    act(() => {
      socketListeners['notification:new']({
        notification: sampleNotif,
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
    });

    expect(playMessageNotificationSound).toHaveBeenCalledWith(0.8);
    expect(useNotificationStore.getState().unreadCounts.total).toBe(1);

    const allCache: any = queryClient.getQueryData([NOTIFICATIONS_KEY, 'all']);
    expect(allCache.pages[0].items[0].id).toBe('notif-1');

    const likesCache: any = queryClient.getQueryData([NOTIFICATIONS_KEY, 'likes']);
    expect(likesCache.pages[0].items[0].id).toBe('notif-1');
  });

  it('handles category mappings for all notification types', () => {
    renderHook(() => useNotificationRealtime(), { wrapper: createWrapper() });

    const types = [
      'LIKE_COMMENT',
      'COMMENT',
      'FOLLOW',
      'MENTION',
      'REPOST',
      'SYSTEM_VERIFIED',
      'SYSTEM_VIEW',
      'SYSTEM',
      'UNKNOWN_TYPE',
    ] as const;

    for (const t of types) {
      act(() => {
        socketListeners['notification:new']({
          notification: { ...sampleNotif, id: `notif-${t}`, type: t as any },
        });
      });
    }
  });

  it('updates existing notification in cache if already present', () => {
    renderHook(() => useNotificationRealtime(), { wrapper: createWrapper() });

    queryClient.setQueryData([NOTIFICATIONS_KEY, 'all'], {
      pages: [
        { items: [{ ...sampleNotif, actionText: 'old text' }], nextCursor: null, hasMore: false },
      ],
      pageParams: [undefined],
    });

    act(() => {
      socketListeners['notification:new']({
        notification: { ...sampleNotif, actionText: 'updated text' },
      });
    });

    const allCache: any = queryClient.getQueryData([NOTIFICATIONS_KEY, 'all']);
    expect(allCache.pages[0].items[0].actionText).toBe('updated text');
  });

  it('shows browser push notification when tab is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    renderHook(() => useNotificationRealtime(), { wrapper: createWrapper() });

    act(() => {
      socketListeners['notification:new']({
        notification: sampleNotif,
      });
    });

    expect(showBrowserPushNotification).toHaveBeenCalledWith({
      title: 'John Doe',
      body: 'liked your post',
      icon: 'https://avatar.png',
      url: '/post/123',
      tag: 'notif-1',
    });

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
  });

  it('suppresses audio and push notifications if DND is active or author is muted', () => {
    useNotificationSettingsStore.setState({
      dndUntil: new Date(Date.now() + 60000).toISOString(),
      mutedActorIds: ['actor-1'],
    });

    renderHook(() => useNotificationRealtime(), { wrapper: createWrapper() });

    act(() => {
      socketListeners['notification:new']({
        notification: sampleNotif,
      });
    });

    expect(playMessageNotificationSound).not.toHaveBeenCalled();
    expect(showBrowserPushNotification).not.toHaveBeenCalled();
  });

  it('handles notification:read for a single notificationId', () => {
    renderHook(() => useNotificationRealtime(), { wrapper: createWrapper() });

    queryClient.setQueryData([NOTIFICATIONS_KEY, 'all'], {
      pages: [
        {
          items: [{ ...sampleNotif, id: 'notif-1', isRead: false }],
          nextCursor: null,
          hasMore: false,
        },
      ],
      pageParams: [undefined],
    });

    act(() => {
      socketListeners['notification:read']({
        notificationId: 'notif-1',
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
    });

    const allCache: any = queryClient.getQueryData([NOTIFICATIONS_KEY, 'all']);
    expect(allCache.pages[0].items[0].isRead).toBe(true);
    expect(useNotificationStore.getState().unreadCounts.total).toBe(0);
  });

  it('handles notification:read with allRead=true', () => {
    renderHook(() => useNotificationRealtime(), { wrapper: createWrapper() });

    queryClient.setQueryData([NOTIFICATIONS_KEY, 'all'], {
      pages: [
        {
          items: [
            { ...sampleNotif, id: 'notif-1', isRead: false },
            { ...sampleNotif, id: 'notif-2', isRead: false },
          ],
          nextCursor: null,
          hasMore: false,
        },
      ],
      pageParams: [undefined],
    });

    act(() => {
      socketListeners['notification:read']({
        allRead: true,
      });
    });

    const allCache: any = queryClient.getQueryData([NOTIFICATIONS_KEY, 'all']);
    expect(allCache.pages[0].items.every((i: any) => i.isRead)).toBe(true);
  });

  it('safely ignores empty or malformed payload in notification:new', () => {
    renderHook(() => useNotificationRealtime(), { wrapper: createWrapper() });

    act(() => {
      socketListeners['notification:new'](null as any);
      socketListeners['notification:read'](null as any);
    });
  });

  it('handles multi-page cache update and settings toggles for notifications', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    useNotificationSettingsStore.setState({
      showName: false,
      showText: false,
    });

    renderHook(() => useNotificationRealtime(), { wrapper: createWrapper() });

    queryClient.setQueryData([NOTIFICATIONS_KEY, 'all'], {
      pages: [
        { items: [{ id: 'notif-other' }], nextCursor: null, hasMore: false },
        { items: [{ id: 'notif-page2' }], nextCursor: null, hasMore: false },
      ],
      pageParams: [undefined, 'page2'],
    });

    act(() => {
      socketListeners['notification:new']({
        notification: { ...sampleNotif, actor: undefined },
      });
    });

    expect(showBrowserPushNotification).toHaveBeenCalledWith({
      title: 'Eternal',
      body: 'You have a new notification',
      icon: null,
      url: '/post/123',
      tag: 'notif-1',
    });

    const allCache: any = queryClient.getQueryData([NOTIFICATIONS_KEY, 'all']);
    expect(allCache.pages[0].items[0].id).toBe('notif-1');
    expect(allCache.pages[1].items[0].id).toBe('notif-page2');

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
  });

  it('safely catches errors from playMessageNotificationSound', () => {
    vi.mocked(playMessageNotificationSound).mockImplementationOnce(() => {
      throw new Error('Autoplay blocked');
    });

    renderHook(() => useNotificationRealtime(), { wrapper: createWrapper() });

    expect(() => {
      act(() => {
        socketListeners['notification:new']({
          notification: sampleNotif,
        });
      });
    }).not.toThrow();
  });
});
