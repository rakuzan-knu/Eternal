import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessengerRealtime } from '../useMessengerRealtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { CONVERSATIONS_KEY, queryKeys } from '@/shared/api/queryKeys';
import {
  playMessageNotificationSound,
  useNotificationSettingsStore,
} from '@/entities/notification';
import type { ConversationView } from '@/entities/chat';
import { chatApi } from '../../api/chatApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

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

vi.mock('@/entities/notification/lib/messageNotificationSound', () => ({
  playMessageNotificationSound: vi.fn(),
  initializeMessageNotificationSound: vi.fn(),
}));
vi.mock('../../api/chatApi', () => ({
  chatApi: {
    getConversation: async () => {
      throw new Error('offline');
    },
  },
}));

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMessengerRealtime', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
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
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each(['open', 'account', 'preferences'] as const)(
    'suppresses a deferred preview after %s changes',
    async (change) => {
      const addToast = vi.fn();
      useMessageToastStore.setState({ toasts: [], addToast });
      useNotificationSettingsStore.setState({ groups: true, privateChats: true });
      queryClient.setQueryData(queryKeys.conversations.root, [
        {
          id: 'conv-1',
          type: 'GROUP',
          participants: [],
          myMuteLevel: 'NONE',
          myEffectiveNotificationMode: 'ALL',
          unreadCount: 0,
        },
      ]);
      const initialProps: { active: string | null } = { active: null };
      const { rerender } = renderHook(
        ({ active }) => useMessengerRealtime(['conv-1'], active, true),
        {
          initialProps,
          wrapper: createWrapper(queryClient),
        },
      );
      let delivery: unknown;
      act(() => {
        delivery = registeredSocketEvents.newMessage?.({
          conversationId: 'conv-1',
          message: {
            id: `deferred-${change}`,
            conversationId: 'conv-1',
            sender: { id: 'other', username: 'other' },
            body: 'Hello',
            messageType: 'TEXT',
            createdAt: new Date().toISOString(),
          },
        });
      });
      act(() => {
        if (change === 'open') rerender({ active: 'conv-1' });
        else if (change === 'account') useAuthStore.setState({ userId: 'another-user' });
        else
          registeredSocketEvents['community:changed']?.({
            communityId: 'community',
            eventId: 'changed',
          });
      });
      await act(async () => {
        await delivery;
      });
      expect(addToast).not.toHaveBeenCalled();
    },
  );

  it.each(['connect', 'resyncRequired'])(
    'refreshes inactive conversation preferences after %s when a personal community event was missed',
    async (event) => {
      const addToast = vi.fn();
      useMessageToastStore.setState({ toasts: [], addToast });
      useNotificationSettingsStore.setState({ groups: true, privateChats: true });
      const stale: ConversationView = {
        id: 'conv-1',
        type: 'GROUP',
        name: 'Community channel',
        avatar: null,
        description: null,
        createdById: null,
        participants: [],
        lastMessage: null,
        unreadCount: 0,
        myTheme: 'default',
        myMuteLevel: 'NONE',
        myNickname: null,
        myEffectiveNotificationMode: 'ALL',
        isArchived: false,
        isPinned: false,
        blockedByMe: false,
        blockingMe: false,
        isBlocked: false,
        pinnedMessages: [],
        createdAt: '2026-10-22T12:00:00Z',
        updatedAt: '2026-10-22T12:00:00Z',
      };
      const current = { ...stale, myEffectiveNotificationMode: 'NONE' } as const;
      queryClient.setQueryData(queryKeys.conversations.detail('conv-1'), stale);
      queryClient.setQueryData(queryKeys.conversations.root, [stale]);
      const getConversation = vi.spyOn(chatApi, 'getConversation').mockResolvedValueOnce(current);
      renderHook(() => useMessengerRealtime([], null, true), {
        wrapper: createWrapper(queryClient),
      });
      const resync = mockOn.mock.calls.find(([name]) => name === event)?.[1];
      expect(resync).toBeTypeOf('function');
      await act(async () => {
        resync();
        // A list refetch alone must not let the older inactive detail override preferences.
        queryClient.setQueryData(queryKeys.conversations.root, [current]);
        await registeredSocketEvents.newMessage?.({
          conversationId: 'conv-1',
          message: {
            id: `after-${event}`,
            conversationId: 'conv-1',
            sender: { id: 'other', username: 'other' },
            body: 'Hello',
            messageType: 'TEXT',
            createdAt: new Date().toISOString(),
          },
        });
      });
      expect(getConversation).toHaveBeenCalledWith('conv-1', expect.any(AbortSignal));
      expect(addToast).not.toHaveBeenCalled();
      expect(playMessageNotificationSound).not.toHaveBeenCalled();
      expect(
        queryClient.getQueryData<ConversationView>(queryKeys.conversations.detail('conv-1'))
          ?.myEffectiveNotificationMode,
      ).toBe('NONE');
    },
  );

  it('alerts only explicit mentions, keeps delivery/unread and suppresses reactions in MENTIONS mode', async () => {
    const addToast = vi.fn();
    useMessageToastStore.setState({ toasts: [], addToast });
    useNotificationSettingsStore.setState({ groups: true });
    queryClient.setQueryData(queryKeys.conversations.root, [
      {
        id: 'conv-1',
        type: 'GROUP',
        name: 'Group',
        participants: [],
        myMuteLevel: 'MESSAGES',
        myMutedUntil: '2020-01-01T00:00:00Z',
        myNotificationMode: null,
        myEffectiveNotificationMode: 'MENTIONS',
        unreadCount: 0,
      },
    ]);
    renderHook(() => useMessengerRealtime(['conv-1'], null, true), {
      wrapper: createWrapper(queryClient),
    });
    const message = {
      conversationId: 'conv-1',
      sender: { id: 'other', username: 'other' },
      body: 'Hello',
      messageType: 'TEXT',
      createdAt: new Date().toISOString(),
      reactions: [{ emoji: '🔥', users: [{ id: 'other', username: 'other' }] }],
    };
    await act(async () => {
      await registeredSocketEvents.newMessage?.({
        conversationId: 'conv-1',
        message: { ...message, id: 'unmentioned', mentionedUserIds: [] },
      });
      await registeredSocketEvents.newMessage?.({
        conversationId: 'conv-1',
        message: { ...message, id: 'mentioned', mentionedUserIds: ['my-user-id'] },
      });
      await registeredSocketEvents.messageReactionAdded?.({
        conversationId: 'conv-1',
        message: { ...message, id: 'mentioned', mentionedUserIds: ['my-user-id'] },
      });
    });
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ id: 'mentioned' }));
    act(() => vi.advanceTimersByTime(50));
    expect(
      queryClient.getQueryData<Array<{ unreadCount: number }>>(queryKeys.conversations.root)?.[0]
        .unreadCount,
    ).toBe(2);
  });

  it('joins conversations and sends socket events', () => {
    renderHook(() => useMessengerRealtime(['conv-1', 'conv-2']), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockEmit).toHaveBeenCalledWith('joinConversation', { conversationId: 'conv-1' });
    expect(mockEmit).toHaveBeenCalledWith('joinConversation', { conversationId: 'conv-2' });
  });

  it('suppresses alerts from stale preferences until a community change can be refreshed', async () => {
    const addToast = vi.fn();
    useMessageToastStore.setState({ toasts: [], addToast });
    queryClient.setQueryData(queryKeys.conversations.root, [
      {
        id: 'conv-1',
        type: 'DIRECT',
        participants: [],
        myMuteLevel: 'NONE',
        myEffectiveNotificationMode: 'ALL',
        unreadCount: 0,
      },
    ]);
    const fetch = vi.spyOn(queryClient, 'fetchQuery');
    renderHook(() => useMessengerRealtime(['conv-1'], null, true), {
      wrapper: createWrapper(queryClient),
    });
    await act(async () => {
      registeredSocketEvents['community:changed']?.({
        communityId: 'community',
        eventId: 'preferences',
      });
      await registeredSocketEvents.newMessage?.({
        conversationId: 'conv-1',
        message: {
          id: 'after-preference-change',
          conversationId: 'conv-1',
          sender: { id: 'other', username: 'other' },
          body: 'Hello',
          messageType: 'TEXT',
          createdAt: new Date().toISOString(),
        },
      });
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.conversations.detail('conv-1'), staleTime: 0 }),
    );
    expect(addToast).not.toHaveBeenCalled();
  });

  it('keeps closed chats unsubscribed and leaves rooms when selection changes', () => {
    const { rerender, unmount } = renderHook(({ ids }) => useMessengerRealtime(ids), {
      initialProps: { ids: [] as string[] },
      wrapper: createWrapper(queryClient),
    });
    expect(mockEmit).not.toHaveBeenCalledWith('joinConversation', expect.anything());
    rerender({ ids: ['conv-1'] });
    expect(mockEmit).toHaveBeenCalledWith('joinConversation', { conversationId: 'conv-1' });
    rerender({ ids: ['conv-2'] });
    expect(mockEmit).toHaveBeenCalledWith('leaveConversation', { conversationId: 'conv-1' });
    unmount();
    expect(mockEmit).toHaveBeenCalledWith('leaveConversation', { conversationId: 'conv-2' });
  });

  it('reconciles the authoritative badge once per burst even for a loaded paged dialog', async () => {
    queryClient.setQueryData(queryKeys.communities.channels('community'), []);
    queryClient.setQueryData(queryKeys.communities.directory(''), []);
    queryClient.setQueryData(queryKeys.conversations.page('my-user-id', {}), {
      pages: [{ data: [{ id: 'conv-1', unreadCount: 0 }], hasMore: true, nextCursor: 'next' }],
      pageParams: [undefined],
    });
    queryClient.setQueryData(queryKeys.conversations.unreadCount, { count: 0 });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { unmount } = renderHook(() => useMessengerRealtime([], null, false), {
      wrapper: createWrapper(queryClient),
    });
    const receive = mockOn.mock.calls.find(([event]) => event === 'newMessage')?.[1];
    expect(receive).toBeTypeOf('function');
    await act(async () => {
      for (let index = 0; index < 100; index++) receive({ conversationId: 'conv-1' });
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: queryKeys.conversations.unreadCount });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(
      invalidate.mock.calls.filter(
        ([options]) => options?.queryKey === queryKeys.conversations.unreadCount,
      ),
    ).toHaveLength(1);
    expect(queryClient.getQueryState(queryKeys.conversations.unreadCount)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(queryKeys.communities.channels('community'))?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(queryKeys.communities.directory(''))?.isInvalidated).toBe(
      false,
    );
    unmount();
    queryClient.clear();
  });

  it('does not create unopened message histories or double-count duplicate events', async () => {
    queryClient.setQueryData(
      [CONVERSATIONS_KEY],
      [{ id: 'conv-1', type: 'DIRECT', unreadCount: 0, myMuteLevel: 'ALL' }],
    );
    renderHook(() => useMessengerRealtime([], null, false), {
      wrapper: createWrapper(queryClient),
    });
    const payload = {
      conversationId: 'conv-1',
      message: {
        id: 'message-1',
        conversationId: 'conv-1',
        sender: { id: 'another-user' },
        createdAt: new Date().toISOString(),
      },
    };
    await act(async () => {
      await registeredSocketEvents.newMessage?.(payload);
      await registeredSocketEvents.newMessage?.(payload);
      vi.advanceTimersByTime(50);
    });
    expect(queryClient.getQueryData(queryKeys.conversations.messages('conv-1'))).toBeUndefined();
    expect(
      queryClient.getQueryData<Array<{ unreadCount: number }>>([CONVERSATIONS_KEY])?.[0]
        ?.unreadCount,
    ).toBe(1);
  });

  it('keeps an incomplete conversation list invalidated after an unknown dialog arrives', async () => {
    queryClient.setQueryData(queryKeys.conversations.root, [{ id: 'existing', unreadCount: 2 }]);
    renderHook(() => useMessengerRealtime([], null, false), {
      wrapper: createWrapper(queryClient),
    });
    await act(async () => {
      await registeredSocketEvents.newMessage?.({
        conversationId: 'new-dialog',
        message: {
          id: 'new-message',
          conversationId: 'new-dialog',
          sender: { id: 'another-user' },
          createdAt: new Date().toISOString(),
        },
      });
    });
    act(() => vi.advanceTimersByTime(50));
    expect(queryClient.getQueryState(queryKeys.conversations.root)?.isInvalidated).toBe(true);
    expect(
      queryClient.getQueryData(queryKeys.conversations.messages('new-dialog')),
    ).toBeUndefined();
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

    act(() => vi.advanceTimersByTime(50));
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

  it('suppresses push notification toasts and sounds on CALL_LOG newMessage events', () => {
    const addToastSpy = vi.fn();
    useMessageToastStore.setState({ toasts: [], addToast: addToastSpy });

    queryClient.setQueryData(
      [CONVERSATIONS_KEY],
      [{ id: 'conv-1', myMuteLevel: 'NONE', participants: [] }],
    );
    queryClient.setQueryData(['conversation', 'conv-1'], {
      id: 'conv-1',
      myMuteLevel: 'NONE',
      type: 'DIRECT',
      participants: [{ user: { id: 'other-user', displayName: 'Kirito Agh' } }],
    });

    renderHook(() => useMessengerRealtime(['conv-1'], null, true), {
      wrapper: createWrapper(queryClient),
    });

    // An incoming CALL_LOG message event arrives when call ends
    act(() => {
      registeredSocketEvents['newMessage']?.({
        conversationId: 'conv-1',
        message: {
          id: 'call-msg-1',
          conversationId: 'conv-1',
          sender: { id: 'other-user', displayName: 'Kirito Agh', username: 'kirito' },
          messageType: 'CALL_LOG',
          body: JSON.stringify({
            callId: '2c80d204-b113-418a-a4d6-692612229ede',
            callType: 'AUDIO',
            status: 'ENDED',
          }),
          createdAt: new Date().toISOString(),
          isDeleted: false,
        },
      });
    });

    // Toast must NOT be added
    expect(addToastSpy).not.toHaveBeenCalled();
  });
});
