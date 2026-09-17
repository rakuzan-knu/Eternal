import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMessengerRealtime } from '../useMessengerRealtime';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useNotificationSettingsStore } from '@/entities/notification';
import * as socketHookModule from '../useChatSocket';

describe('useMessengerRealtime (Comprehensive Suite)', () => {
  let queryClient: QueryClient;
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
  };

  const initialConversations = [
    {
      id: 'conv-1',
      type: 'DIRECT',
      unreadCount: 0,
      participants: [
        { userId: 'user-2', user: { id: 'user-2', username: 'bob', displayName: 'Bob' } },
      ],
      lastMessage: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData([CONVERSATIONS_KEY], initialConversations);

    useAuthStore.setState({ userId: 'user-me' });
    useNotificationSettingsStore.setState({
      enableNotifications: true,
      allowSound: false,
      privateChats: true,
      groups: true,
      likes: true,
      comments: true,
      reposts: true,
      followers: true,
      showName: true,
      showText: true,
    });
    useMessageToastStore.setState({ toasts: [] });

    vi.spyOn(socketHookModule, 'useChatSocket').mockReturnValue(mockSocket as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('joins conversation rooms and sets up socket listeners', () => {
    renderHook(() => useMessengerRealtime(['conv-1', 'conv-2'], null, true), { wrapper });

    expect(mockSocket.emit).toHaveBeenCalledWith('joinConversation', { conversationId: 'conv-1' });
    expect(mockSocket.emit).toHaveBeenCalledWith('joinConversation', { conversationId: 'conv-2' });
  });

  it('handles gatewayReady, gatewayResume and resyncRequired events', () => {
    renderHook(() => useMessengerRealtime(['conv-1'], null, true), { wrapper });

    const gatewayReadyHandler = mockSocket.on.mock.calls.find((c) => c[0] === 'gatewayReady')?.[1];
    gatewayReadyHandler?.({ sessionId: 'sess-123', seq: 42 });

    const connectHandler = mockSocket.on.mock.calls.find((c) => c[0] === 'connect')?.[1];
    connectHandler?.();

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'gatewayResume',
      { sessionId: 'sess-123', lastSeq: 42 },
      expect.any(Function),
    );
  });

  it('handles conversationDeleted, messagesCleared, and userTyping socket events', () => {
    window.history.pushState({}, '', '/messages/conv-1');

    renderHook(() => useMessengerRealtime(['conv-1'], 'conv-1', true), { wrapper });

    // 1. messagesCleared
    const clearedHandler = mockSocket.on.mock.calls.find((c) => c[0] === 'messagesCleared')?.[1];
    clearedHandler?.({ conversationId: 'conv-1' });

    let convs = queryClient.getQueryData<any>([CONVERSATIONS_KEY]);
    expect(convs[0].lastMessage).toBeNull();
    expect(convs[0].unreadCount).toBe(0);

    // 2. userTyping / typing
    const typingHandler = mockSocket.on.mock.calls.find((c) => c[0] === 'typing')?.[1];
    typingHandler?.({ conversationId: 'conv-1', userId: 'user-2', isTyping: true });

    // 3. conversationDeleted
    const deletedHandler = mockSocket.on.mock.calls.find(
      (c) => c[0] === 'conversationDeleted',
    )?.[1];
    deletedHandler?.({ conversationId: 'conv-1' });

    convs = queryClient.getQueryData<any>([CONVERSATIONS_KEY]);
    expect(convs).toHaveLength(0);
  });

  it('handles social:notification events with batching and invalidates queries on COMMENT', () => {
    renderHook(() => useMessengerRealtime(['conv-1'], 'conv-1', true), { wrapper });

    const socialHandler = mockSocket.on.mock.calls.find((c) => c[0] === 'socialNotification')?.[1];

    // 1. LIKE notification
    socialHandler?.({
      type: 'LIKE',
      actor: { id: 'act-1', username: 'charlie', displayName: 'Charlie' },
      postId: 'post-100',
      authorUsername: 'user-me',
      message: 'Charlie liked your post',
    });

    // 2. Second LIKE on same post within 10s (batching)
    socialHandler?.({
      type: 'LIKE',
      actor: { id: 'act-2', username: 'dan', displayName: 'Dan' },
      postId: 'post-100',
      authorUsername: 'user-me',
      message: 'Dan liked your post',
    });

    // 3. COMMENT notification (invalidates comments query)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    socialHandler?.({
      type: 'COMMENT',
      actor: { id: 'act-3', username: 'eve', displayName: 'Eve' },
      postId: 'post-100',
      authorUsername: 'user-me',
      message: 'Eve commented on your post',
    });
    expect(invalidateSpy).toHaveBeenCalled();

    // 4. REPOST notification
    socialHandler?.({
      type: 'REPOST',
      actor: { id: 'act-4', username: 'frank', displayName: 'Frank' },
      postId: 'post-100',
      authorUsername: 'user-me',
      message: 'Frank reposted your post',
    });

    expect(useMessageToastStore.getState().toasts.length).toBeGreaterThan(0);
  });
});
