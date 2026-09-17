import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessengerRealtime } from '../useMessengerRealtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { useNotificationSettingsStore } from '@/entities/notification';
import { useAuthStore } from '@/shared/model/useAuthStore';

const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const registeredSocketEvents: Record<string, (payload: any) => void> = {};

vi.mock('../useChatSocket', () => ({
  useChatSocket: () => ({
    connected: true,
    emit: mockEmit,
    on: mockOn,
    off: mockOff,
  }),
}));

vi.mock('../useChatSocketEvent', () => ({
  useChatSocketEvent: (event: string, handler: (payload: any) => void) => {
    registeredSocketEvents[event] = handler;
  },
}));

vi.mock('@/shared/lib/messageNotificationSound', () => ({
  playMessageNotificationSound: vi.fn(),
  initializeMessageNotificationSound: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMessengerRealtime', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in registeredSocketEvents) {
      delete registeredSocketEvents[key];
    }
    useAuthStore.setState({ userId: 'my-user-id' });
    useNotificationSettingsStore.setState({
      enableNotifications: true,
      allowSound: true,
      showName: true,
      showText: true,
      reactions: true,
      followers: true,
      likes: true,
      comments: true,
      reposts: true,
      volume: 0.8,
      dndUntil: null,
      mutedActorIds: [],
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('joins conversations and sends socket events', () => {
    renderHook(() => useMessengerRealtime(['conv-1', 'conv-2']), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockEmit).toHaveBeenCalledWith('joinConversation', { conversationId: 'conv-1' });
    expect(mockEmit).toHaveBeenCalledWith('joinConversation', { conversationId: 'conv-2' });
  });

  it('handles messageReactionAdded, conversationUpdated, newFollower, and socialNotification events', () => {
    // Set pathname to /feed so push notification toasts are added
    window.history.pushState({}, '', '/feed');

    queryClient.setQueryData([CONVERSATIONS_KEY], [{ id: 'conv-1', myMuteLevel: 'NONE' }]);
    queryClient.setQueryData(['conversation', 'conv-1'], {
      id: 'conv-1',
      name: 'Old Group Name',
    });

    renderHook(() => useMessengerRealtime(['conv-1']), {
      wrapper: createWrapper(queryClient),
    });

    // 1. handleReactionAdded (from other conversation, not active, not on /messages page)
    act(() => {
      registeredSocketEvents['messageReactionAdded']?.({
        conversationId: 'conv-2',
        message: {
          id: 'msg-1',
          reactions: [
            {
              emoji: '🔥',
              users: [
                { id: 'other-user', displayName: 'Other User', avatar: 'https://avatar.png' },
              ],
            },
          ],
        },
      });
    });

    // 2. handleConversationUpdated (updates both list and single cache)
    act(() => {
      registeredSocketEvents['conversationUpdated']?.({
        id: 'conv-1',
        name: 'Updated Group Name',
      });
    });

    const cachedConv: any = queryClient.getQueryData([CONVERSATIONS_KEY]);
    expect(cachedConv[0].name).toBe('Updated Group Name');
    const cachedSingle: any = queryClient.getQueryData(['conversation', 'conv-1']);
    expect(cachedSingle?.name).toBe('Updated Group Name');

    // 3. handleNewFollower (event name is 'newFollower')
    act(() => {
      registeredSocketEvents['newFollower']?.({
        follower: { id: 'usr-fol', username: 'follower1', displayName: 'Follower 1', avatar: null },
        status: 'ACCEPTED',
      });
      registeredSocketEvents['newFollower']?.({
        follower: { id: 'usr-fol2', username: 'follower2', displayName: null, avatar: null },
        status: 'PENDING',
      });
    });

    // 4. handleSocialNotification (event name is 'socialNotification' - LIKE, COMMENT, REPOST)
    act(() => {
      registeredSocketEvents['socialNotification']?.({
        type: 'LIKE',
        actor: { id: 'usr-actor', username: 'actor1', displayName: 'Actor 1', avatar: null },
        postId: 'post-1',
        authorUsername: 'me',
        message: 'liked your post',
      });
      registeredSocketEvents['socialNotification']?.({
        type: 'COMMENT',
        actor: { id: 'usr-actor', username: 'actor1', displayName: 'Actor 1', avatar: null },
        postId: 'post-1',
        authorUsername: 'me',
        message: 'commented on your post',
      });
      registeredSocketEvents['socialNotification']?.({
        type: 'REPOST',
        actor: { id: 'usr-actor', username: 'actor1', displayName: 'Actor 1', avatar: null },
        postId: 'post-1',
        authorUsername: 'me',
        message: 'reposted your post',
      });
    });
  });
});
