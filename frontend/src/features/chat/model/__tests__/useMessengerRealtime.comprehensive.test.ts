import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMessengerRealtime } from '../useMessengerRealtime';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useNotificationSettingsStore } from '@/shared/model/useNotificationSettingsStore';
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
});
