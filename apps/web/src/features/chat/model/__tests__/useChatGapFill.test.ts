import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useChatGapFill } from '../useChatGapFill';
import { queryKeys } from '@/shared/api/queryKeys';
import type { InfiniteMessagesData, MessageView } from '@/entities/chat/model/types';
import { chatApi } from '../../api/chatApi';
import { getRealtimeChatBatch } from '../realtimeChatBatch';
import { applyIncomingMessage } from '../chatCacheSync';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { resetSessionStores } from '@/shared/model/resetSession';

vi.mock('@/shared/api/idbPersister', () => ({ idbPersister: { removeClient: async () => {} } }));

vi.mock('../../api/chatApi', () => ({
  chatApi: { getMessages: vi.fn() },
}));

vi.mock('@/shared/api/socket', () => {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    getSocket: () => ({
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        (handlers[event] ??= []).push(handler);
      }),
      off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers[event] = (handlers[event] ?? []).filter((h) => h !== handler);
      }),
      __emit: (event: string, ...args: unknown[]) => {
        (handlers[event] ?? []).forEach((h) => h(...args));
      },
    }),
    disconnectSocket: vi.fn(),
  };
});

function msg(id: string): MessageView {
  return {
    id,
    conversationId: 'conv-1',
    sender: { id: 'u1', username: 'u1', displayName: null, avatar: null },
    body: 'hi',
    messageType: 'TEXT',
    replyTo: null,
    forwardedFrom: null,
    attachments: [],
    reactions: [],
    readBy: [],
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    editedAt: null,
  } as MessageView;
}

describe('useChatGapFill', () => {
  let queryClient: QueryClient;
  let releaseBatch: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ userId: 'gap-fill-user', isAuthenticated: true });
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData<InfiniteMessagesData>(queryKeys.conversations.messages('conv-1'), {
      pages: [{ data: [msg('100')], hasMore: false, nextCursor: null }],
      pageParams: [undefined],
    });
  });

  afterEach(() => {
    releaseBatch?.();
    releaseBatch = undefined;
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('fetches REST delta with after=<latest snowflake> and merges without dupes', async () => {
    vi.mocked(chatApi.getMessages).mockResolvedValue({
      data: [msg('100'), msg('101'), msg('102')],
      hasMore: false,
      nextCursor: null,
    });

    const { result } = renderHook(() => useChatGapFill(['conv-1']), { wrapper });

    let filled = 0;
    await act(async () => {
      const res = await result.current.fillConversation('conv-1');
      filled = res;
    });

    expect(chatApi.getMessages).toHaveBeenCalledWith(
      'conv-1',
      undefined,
      50,
      '100',
      expect.any(AbortSignal),
    );
    expect(filled).toBe(2);
    const cached = queryClient.getQueryData<InfiniteMessagesData>(
      queryKeys.conversations.messages('conv-1'),
    );
    expect(cached?.pages[0].data.map((m) => m.id).sort()).toEqual(['100', '101', '102']);
  });

  it('uses already received buffered messages when selecting the REST cursor', async () => {
    vi.mocked(chatApi.getMessages).mockResolvedValue({
      data: [],
      hasMore: false,
      nextCursor: null,
    });
    const batch = getRealtimeChatBatch(queryClient, 'gap-fill-user');
    releaseBatch = batch.retain();
    batch.enqueue((cache) => applyIncomingMessage(cache, 'conv-1', msg('101')));
    const { result } = renderHook(() => useChatGapFill(['conv-1']), { wrapper });

    await act(async () => {
      await result.current.fillConversation('conv-1');
    });

    expect(chatApi.getMessages).toHaveBeenCalledWith(
      'conv-1',
      undefined,
      50,
      '101',
      expect.any(AbortSignal),
    );
  });

  it('flushes events received during REST fetch before merging its delta', async () => {
    let resolvePage!: (page: { data: MessageView[]; hasMore: boolean; nextCursor: null }) => void;
    vi.mocked(chatApi.getMessages).mockReturnValue(
      new Promise((resolve) => {
        resolvePage = resolve;
      }),
    );
    const batch = getRealtimeChatBatch(queryClient, 'gap-fill-user');
    releaseBatch = batch.retain();
    const { result } = renderHook(() => useChatGapFill(['conv-1']), { wrapper });
    let filled = 0;

    await act(async () => {
      const pending = result.current.fillConversation('conv-1');
      batch.enqueue((cache) => applyIncomingMessage(cache, 'conv-1', msg('101')));
      resolvePage({ data: [msg('101'), msg('102')], hasMore: false, nextCursor: null });
      filled = await pending;
    });

    expect(filled).toBe(1);
    expect(
      queryClient
        .getQueryData<InfiniteMessagesData>(queryKeys.conversations.messages('conv-1'))
        ?.pages[0].data.map((m) => m.id),
    ).toEqual(['102', '101', '100']);
  });

  it('invalidates when there is no local baseline', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useChatGapFill(['conv-empty']), { wrapper });

    await act(async () => {
      await result.current.fillConversation('conv-empty');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.conversations.messages('conv-empty'),
    });
    expect(chatApi.getMessages).not.toHaveBeenCalled();
  });

  it.each(['unmount', 'account switch', 'reset'] as const)(
    'ignores a delayed REST delta after %s',
    async (boundary) => {
      let resolvePage!: (page: { data: MessageView[]; hasMore: boolean; nextCursor: null }) => void;
      vi.mocked(chatApi.getMessages).mockReturnValue(
        new Promise((resolve) => {
          resolvePage = resolve;
        }),
      );
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result, unmount } = renderHook(() => useChatGapFill(['conv-1']), { wrapper });
      const pending = result.current.fillAllGaps();
      act(() => {
        if (boundary === 'unmount') unmount();
        else if (boundary === 'account switch') useAuthStore.setState({ userId: 'next-account' });
        else resetSessionStores();
        queryClient.clear();
        queryClient.setQueryData<InfiniteMessagesData>(queryKeys.conversations.messages('conv-1'), {
          pages: [{ data: [msg('200')], hasMore: false, nextCursor: null }],
          pageParams: [undefined],
        });
      });
      await act(async () => {
        resolvePage({ data: [msg('101')], hasMore: false, nextCursor: null });
        await pending;
      });
      expect(
        queryClient
          .getQueryData<InfiniteMessagesData>(queryKeys.conversations.messages('conv-1'))
          ?.pages[0].data.map((row) => row.id),
      ).toEqual(['200']);
      expect(invalidateSpy).not.toHaveBeenCalled();
    },
  );

  it('fillAllGaps reconciles the conversation list', async () => {
    vi.mocked(chatApi.getMessages).mockResolvedValue({
      data: [],
      hasMore: false,
      nextCursor: null,
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useChatGapFill(['conv-1']), { wrapper });

    await act(async () => {
      await result.current.fillAllGaps();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.conversations.root });
    });
  });
});
