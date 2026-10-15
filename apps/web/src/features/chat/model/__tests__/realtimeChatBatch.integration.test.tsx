import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ConversationView,
  InfiniteMessagesData,
  MessageView,
} from '@/entities/chat/model/types';
import { queryKeys } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useNotificationSettingsStore } from '@/entities/notification';
import { useMessengerRealtime } from '../useMessengerRealtime';
import { useConversationRealtime } from '../useConversationRealtime';
import { useMessageActions } from '../useMessageActions';
import { resetSessionStores } from '@/shared/model/resetSession';
import { useTypingStore } from '../useTypingStore';
import { historyWindowKey } from '../historyWindow';
import { historyColdCache } from '../historyColdCache';

const transport = vi.hoisted(() => {
  const listeners = new Map<string, Set<(payload?: any) => void>>();
  return {
    connected: true,
    emit: vi.fn(),
    on: (event: string, callback: (payload?: any) => void) => {
      const callbacks = listeners.get(event) ?? new Set();
      callbacks.add(callback);
      listeners.set(event, callbacks);
    },
    off: (event: string, callback: (payload?: any) => void) =>
      listeners.get(event)?.delete(callback),
    receive: (event: string, payload?: unknown) => {
      [...(listeners.get(event) ?? [])].forEach((callback) => callback(payload));
    },
    reset: () => listeners.clear(),
  };
});
vi.mock('../useChatSocket', () => ({ useChatSocket: () => transport }));
vi.mock('../../lib/e2ee/messageE2ee', () => ({ ensureMessageIdentityRegistered: async () => {} }));
vi.mock('@/shared/lib/messageNotificationSound', () => ({
  playMessageNotificationSound: vi.fn(),
  initializeMessageNotificationSound: vi.fn(),
}));
vi.mock('@/shared/api/idbPersister', () => ({ idbPersister: { removeClient: async () => {} } }));

function message(id: string): MessageView {
  return {
    id,
    conversationId: 'conversation',
    sender: { id: 'peer', username: 'peer', displayName: null, avatar: null },
    body: id,
    messageType: 'TEXT',
    replyTo: null,
    forwardedFrom: null,
    attachments: [],
    reactions: [],
    readBy: [],
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    createdAt: '2026-10-10T10:00:00.000Z',
    editedAt: null,
  } as MessageView;
}

describe('shared realtime cache batching', () => {
  let queryClient: QueryClient;
  let writes: string[];
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const cachedMessages = () =>
    queryClient
      .getQueryData<InfiniteMessagesData>(queryKeys.conversations.messages('conversation'))
      ?.pages.flatMap((page) => page.data);
  const cachedConversation = () =>
    queryClient.getQueryData<ConversationView[]>(queryKeys.conversations.root)?.[0];

  beforeEach(() => {
    vi.useFakeTimers();
    transport.reset();
    transport.emit.mockReset();
    transport.connected = true;
    localStorage.clear();
    useAuthStore.setState({ userId: 'me', isAuthenticated: true });
    useNotificationSettingsStore.setState({ enableNotifications: false, allowSound: false });
    useTypingStore.setState({ typingByConversation: {} });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    queryClient.setQueryData(queryKeys.conversations.root, [
      {
        id: 'conversation',
        type: 'DIRECT',
        participants: [],
        pinnedMessages: [],
        lastMessage: null,
        unreadCount: 0,
        myMuteLevel: 'NONE',
        createdAt: '2026-10-10T09:00:00.000Z',
        updatedAt: '2026-10-10T09:00:00.000Z',
      },
    ]);
    queryClient.setQueryData(queryKeys.conversations.messages('conversation'), {
      pages: [{ data: [], hasMore: false, nextCursor: null }],
      pageParams: [undefined],
    });
    writes = [];
    queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success')
        writes.push(event.query.queryHash);
    });
  });
  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
  });

  it('commits a burst once per query and retains every unique message and unread increment', () => {
    renderHook(
      () => {
        useMessengerRealtime([], null);
        useConversationRealtime('conversation');
      },
      { wrapper },
    );
    act(() => {
      for (let i = 1; i <= 50; i++)
        transport.receive('newMessage', {
          conversationId: 'conversation',
          message: message(`message-${i}`),
        });
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('message-50'),
      });
    });
    expect(cachedMessages()).toEqual([]);
    expect(cachedConversation()?.unreadCount).toBe(0);
    expect(writes).toEqual([]);
    act(() => vi.advanceTimersByTime(50));
    expect(cachedMessages()).toHaveLength(50);
    expect(cachedMessages()?.[0].id).toBe('message-50');
    expect(cachedConversation()?.unreadCount).toBe(50);
    expect(
      writes.filter(
        (hash) => hash === JSON.stringify(queryKeys.conversations.messages('conversation')),
      ),
    ).toHaveLength(1);
    expect(
      writes.filter((hash) => hash === JSON.stringify(queryKeys.conversations.root)),
    ).toHaveLength(1);
  });

  it('preserves new, edit, reaction, and delete order within the same window', () => {
    renderHook(
      () => {
        useMessengerRealtime([], null);
        useConversationRealtime('conversation');
      },
      { wrapper },
    );
    const incoming = message('ordered');
    act(() => {
      transport.receive('newMessage', { conversationId: 'conversation', message: incoming });
      transport.receive('messageEdited', {
        conversationId: 'conversation',
        message: { ...incoming, body: 'edited', isEdited: true },
      });
      transport.receive('messageReactionAdded', {
        conversationId: 'conversation',
        message: {
          ...incoming,
          body: 'edited',
          isEdited: true,
          reactions: [{ emoji: '👍', count: 1, users: [], selfReacted: false }],
        },
      });
      transport.receive('messageDeleted', {
        conversationId: 'conversation',
        messageId: incoming.id,
      });
      vi.advanceTimersByTime(50);
    });
    expect(cachedMessages()?.[0]).toMatchObject({
      id: 'ordered',
      body: null,
      isDeleted: true,
      isEdited: true,
    });
    expect(cachedMessages()?.[0].reactions).toHaveLength(1);
    expect(
      writes.filter(
        (hash) => hash === JSON.stringify(queryKeys.conversations.messages('conversation')),
      ),
    ).toHaveLength(1);
  });

  it('flushes received messages on disconnect and dedupes their replay after reconnect', () => {
    renderHook(() => useMessengerRealtime([], null), { wrapper });
    act(() => {
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('before-disconnect'),
      });
      transport.connected = false;
      transport.receive('disconnect');
    });
    expect(cachedConversation()?.unreadCount).toBe(1);
    act(() => {
      transport.connected = true;
      transport.receive('connect');
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('before-disconnect'),
      });
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('after-reconnect'),
      });
      vi.advanceTimersByTime(50);
    });
    expect(cachedConversation()?.unreadCount).toBe(2);
    expect(cachedMessages()).toHaveLength(2);
  });

  it('patches loaded older rows without appending incoming tail into their anchored window', () => {
    const older = message('older');
    const historyKey = historyWindowKey('conversation', 'me');
    const coldToken = historyColdCache.token({ accountId: 'me', conversationId: 'conversation' });
    queryClient.setQueryData(historyKey, {
      pages: [{ data: [older], hasMore: true, nextCursor: 'older', cacheable: true }],
      pageParams: [{ direction: 'around-message', cursor: older.id }],
    });
    writes = [];
    renderHook(() => useConversationRealtime('conversation'), { wrapper });
    act(() => {
      transport.receive('messageEdited', {
        conversationId: 'conversation',
        message: { ...older, body: 'edited older', isEdited: true },
      });
      transport.receive('messagePinned', { conversationId: 'conversation', messageId: older.id });
      transport.receive('messageReactionAdded', {
        conversationId: 'conversation',
        message: {
          ...older,
          body: 'edited older',
          isEdited: true,
          isPinned: true,
          reactions: [{ emoji: '👍', count: 1, users: [], selfReacted: false }],
        },
      });
      transport.receive('newMessage', { conversationId: 'conversation', message: message('live') });
      vi.advanceTimersByTime(50);
    });
    const cached = queryClient.getQueryData<InfiniteMessagesData>(historyKey);
    expect(cached?.pages[0].data).toHaveLength(1);
    expect(cached?.pages[0].data[0]).toMatchObject({
      body: 'edited older',
      isEdited: true,
      isPinned: true,
    });
    expect(cached?.pages[0].data[0].reactions).toHaveLength(1);
    expect(historyColdCache.isCurrent(coldToken)).toBe(false);
    expect(
      queryClient.getQueryData<{ pages: { cacheable: boolean }[] }>(historyKey)?.pages[0].cacheable,
    ).toBe(false);
    expect(cachedConversation()?.pinnedMessages[0]?.id).toBe(older.id);
    expect(cachedMessages()?.[0].id).toBe('live');
    expect(writes.filter((hash) => hash === JSON.stringify(historyKey))).toHaveLength(1);

    act(() => {
      transport.receive('messageUnpinned', { conversationId: 'conversation', messageId: older.id });
      transport.receive('messageDeleted', { conversationId: 'conversation', messageId: older.id });
      vi.advanceTimersByTime(50);
    });
    expect(
      queryClient.getQueryData<InfiniteMessagesData>(historyKey)?.pages[0].data[0],
    ).toMatchObject({ body: null, isDeleted: true, isPinned: false });
  });

  it('updates historical edits and deletions while their thread is closed', () => {
    const older = message('closed-history');
    const historyKey = historyWindowKey('conversation', 'me');
    queryClient.setQueryData(historyKey, {
      pages: [{ data: [older], hasMore: false, nextCursor: null, cacheable: true }],
      pageParams: [undefined],
    });
    renderHook(() => useMessengerRealtime([], null), { wrapper });
    act(() => {
      transport.receive('messageEdited', {
        conversationId: 'conversation',
        message: { ...older, body: 'changed elsewhere', isEdited: true },
      });
      vi.advanceTimersByTime(50);
    });
    expect(queryClient.getQueryData<InfiniteMessagesData>(historyKey)?.pages[0].data[0].body).toBe(
      'changed elsewhere',
    );
    act(() => {
      transport.receive('messageDeleted', { conversationId: 'conversation', messageId: older.id });
      vi.advanceTimersByTime(50);
    });
    expect(
      queryClient.getQueryData<InfiniteMessagesData>(historyKey)?.pages[0].data[0],
    ).toMatchObject({ isDeleted: true, body: null });
  });

  it('applies replayed edit/delete/clear events in their gateway order', () => {
    renderHook(() => useMessengerRealtime([], null), { wrapper });
    act(() => transport.receive('gatewayReady', { sessionId: 'replay-session', seq: 1 }));
    transport.emit.mockImplementation(
      (event: string, _payload: unknown, acknowledge?: (res: unknown) => void) => {
        if (event === 'gatewayResume')
          acknowledge?.({
            status: 'ok',
            currentSeq: 5,
            events: [
              {
                seq: 2,
                event: 'newMessage',
                payload: { conversationId: 'conversation', message: message('replay') },
              },
              {
                seq: 3,
                event: 'messageEdited',
                payload: {
                  conversationId: 'conversation',
                  message: { ...message('replay'), body: 'edited', isEdited: true },
                },
              },
              {
                seq: 4,
                event: 'messageDeleted',
                payload: { conversationId: 'conversation', messageId: 'replay' },
              },
            ],
          });
      },
    );
    act(() => {
      transport.receive('connect');
      vi.advanceTimersByTime(50);
    });
    expect(cachedMessages()?.[0]).toMatchObject({ body: null, isEdited: true, isDeleted: true });
    transport.emit.mockImplementation(
      (event: string, _payload: unknown, acknowledge?: (res: unknown) => void) => {
        if (event === 'gatewayResume')
          acknowledge?.({
            status: 'ok',
            currentSeq: 6,
            events: [
              { seq: 6, event: 'messagesCleared', payload: { conversationId: 'conversation' } },
            ],
          });
      },
    );
    act(() => {
      transport.receive('connect');
      vi.advanceTimersByTime(50);
    });
    expect(cachedMessages()).toEqual([]);
    expect(cachedConversation()?.unreadCount).toBe(0);
  });

  it('flushes on final unmount and leaves no delayed writes after cache removal', () => {
    const { unmount } = renderHook(() => useMessengerRealtime([], null), { wrapper });
    act(() =>
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('before-unmount'),
      }),
    );
    unmount();
    expect(cachedConversation()?.unreadCount).toBe(1);
    queryClient.clear();
    act(() => vi.advanceTimersByTime(100));
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('keeps an incomplete list invalidated when unknown and known messages share a window', () => {
    renderHook(() => useMessengerRealtime([], null), { wrapper });
    act(() => {
      transport.receive('newMessage', {
        conversationId: 'missing',
        message: { ...message('unknown'), conversationId: 'missing' },
      });
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('known'),
      });
      vi.advanceTimersByTime(50);
    });
    expect(queryClient.getQueryState(queryKeys.conversations.root)?.isInvalidated).toBe(true);
    expect(cachedConversation()?.unreadCount).toBe(1);
    expect(queryClient.getQueryData(queryKeys.conversations.messages('missing'))).toBeUndefined();
  });

  it('applies an optimistic edit after received state and never restores the old queued body', async () => {
    const { result } = renderHook(
      () => {
        useMessengerRealtime([], null);
        return useMessageActions('conversation');
      },
      { wrapper },
    );
    transport.emit.mockImplementation(
      (event: string, _payload: unknown, acknowledge?: (res: unknown) => void) => {
        if (event === 'editMessage') acknowledge?.({ status: 'ok' });
      },
    );
    await act(async () => {
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('optimistic'),
      });
      await result.current.editMessage('optimistic', 'locally edited');
    });
    expect(cachedMessages()?.[0]).toMatchObject({
      id: 'optimistic',
      body: 'locally edited',
      isEdited: true,
    });
    act(() => vi.advanceTimersByTime(50));
    expect(cachedMessages()?.[0].body).toBe('locally edited');
  });

  it('cancels queued cache writes before session reset and ignores old callbacks', () => {
    const { unmount } = renderHook(() => useMessengerRealtime([], null), { wrapper });
    act(() => {
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('old-session'),
      });
      resetSessionStores();
      queryClient.clear();
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('late-old-session'),
      });
      transport.receive('disconnect');
      vi.advanceTimersByTime(100);
    });
    unmount();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(writes).toEqual([]);
  });

  it('keeps batching active after StrictMode effect cleanup and setup', () => {
    const strictWrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </React.StrictMode>
    );
    renderHook(() => useMessengerRealtime([], null), { wrapper: strictWrapper });
    act(() => {
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('strict'),
      });
      vi.advanceTimersByTime(50);
    });
    expect(cachedConversation()?.unreadCount).toBe(1);
  });

  it('merges queued messages into a query result that arrives during the window', () => {
    renderHook(() => useMessengerRealtime([], null), { wrapper });
    act(() => {
      transport.receive('newMessage', {
        conversationId: 'conversation',
        message: message('queued'),
      });
      queryClient.setQueryData(queryKeys.conversations.messages('conversation'), {
        pages: [{ data: [message('rest-result')], hasMore: false, nextCursor: null }],
        pageParams: [undefined],
      });
      vi.advanceTimersByTime(50);
    });
    expect(cachedMessages()?.map((entry) => entry.id)).toEqual(['queued', 'rest-result']);
  });

  it('does not count queued messages again when a refreshed list already includes them', () => {
    renderHook(() => useMessengerRealtime([], null), { wrapper });
    const first = { ...message('100'), createdAt: '2026-10-10T10:00:00.000Z' };
    const second = { ...message('101'), createdAt: '2026-10-10T10:00:00.001Z' };
    act(() => {
      transport.receive('newMessage', { conversationId: 'conversation', message: first });
      transport.receive('newMessage', { conversationId: 'conversation', message: second });
      queryClient.setQueryData<ConversationView[]>(queryKeys.conversations.root, (prev) =>
        prev?.map((conversation) => ({ ...conversation, lastMessage: second, unreadCount: 2 })),
      );
      vi.advanceTimersByTime(50);
    });
    expect(cachedConversation()?.unreadCount).toBe(2);
    expect(cachedConversation()?.lastMessage?.id).toBe('101');
    expect(cachedMessages()).toHaveLength(2);
  });

  it('coalesces typing bursts before store publication and active-thread renders', () => {
    let renders = 0;
    let publications = 0;
    const { result, unmount } = renderHook(
      () => {
        renders += 1;
        useMessengerRealtime([], null);
        return useConversationRealtime('conversation');
      },
      { wrapper },
    );
    const unsubscribe = useTypingStore.subscribe(() => {
      publications += 1;
    });
    const before = renders;
    act(() => {
      for (let i = 0; i < 100; i++)
        transport.receive('typing', {
          conversationId: 'conversation',
          userId: 'peer',
          isTyping: i % 2 === 1,
        });
    });
    expect(publications).toBe(0);
    expect(renders).toBe(before);
    act(() => vi.advanceTimersByTime(50));
    expect(publications).toBe(1);
    expect(renders).toBe(before + 1);
    expect(result.current.typingUserIds.has('peer')).toBe(true);
    expect(useTypingStore.getState().typingByConversation.conversation).toHaveLength(1);
    unsubscribe();
    unmount();
  });
});
