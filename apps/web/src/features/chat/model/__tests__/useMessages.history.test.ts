import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessages } from '../useMessages';
import { chatApi } from '../../api/chatApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import type { MessageView, InfiniteMessagesData } from '@/entities/chat/model/types';

const disk = vi.hoisted(() => new Map<string, unknown>());
vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async (key: string) => structuredClone(disk.get(key)),
  set: async (key: string, value: unknown) => {
    disk.set(key, structuredClone(value));
  },
  del: async (key: string) => {
    disk.delete(key);
  },
}));
vi.mock('../../api/chatApi', () => ({
  chatApi: { getMessages: vi.fn(), getMessagesAround: vi.fn(), getMessagesAroundDate: vi.fn() },
}));

function message(n: number): MessageView {
  return {
    id: `m${n}`,
    conversationId: 'history-chat',
    body: `Message ${n}`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString(),
    sender: { id: 'peer', username: 'peer', displayName: null, avatar: null },
    attachments: [],
    reactions: [],
    readBy: [],
    replyTo: null,
    forwardedFrom: null,
    messageType: 'TEXT',
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    editedAt: null,
  } as MessageView;
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  const hook = renderHook(() => useMessages('history-chat'), { wrapper });
  return { client, ...hook };
}

beforeEach(() => {
  vi.clearAllMocks();
  disk.clear();
  useAuthStore.setState({ userId: 'account-a', isAuthenticated: true });
  vi.mocked(chatApi.getMessages).mockImplementation(async (_id, before, limit = 20, after) => {
    const end = before
      ? Number(before.slice(1)) - 1
      : after
        ? Math.min(600, Number(after.slice(1)) + limit)
        : 600;
    const start = after ? Number(after.slice(1)) + 1 : Math.max(1, end - limit + 1);
    const data = Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => message(end - i));
    const hasMore = after ? end < 600 : start > 1;
    return { data, hasMore, nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null };
  });
});

describe('bounded historical browsing', () => {
  it('scrolls thirty pages while retaining one live head and at most four aligned history pages', async () => {
    const { result, client } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (let n = 0; n < 30; n++)
      await act(async () => {
        await result.current.fetchNextPage();
      });
    const head = client.getQueryData<InfiniteMessagesData>(
      queryKeys.conversations.messages('history-chat'),
    )!;
    const history = client.getQueryData<InfiniteMessagesData>([
      'conversation-messages',
      'history-chat',
      'history-window',
      'account-a',
    ]);
    expect(head.pages).toHaveLength(1);
    expect(head.pages[0].data[0].id).toBe('m600');
    expect(history?.pages.length).toBeLessThanOrEqual(4);
    expect(history?.pageParams.length).toBe(history?.pages.length);
    expect(result.current.messages).toHaveLength(80);
    expect(result.current.messages[0].id).toBe('m1');
    expect(result.current.messages.at(-1)?.id).toBe('m80');
  });

  it('restores an evicted adjacent raw page when reversing without another REST request', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (let n = 0; n < 8; n++)
      await act(async () => {
        await result.current.fetchNextPage();
      });
    const requests = vi.mocked(chatApi.getMessages).mock.calls.length;
    await act(async () => {
      await result.current.loadNewer();
    });
    expect(vi.mocked(chatApi.getMessages).mock.calls.length).toBe(requests);
    expect(result.current.messages[0].id).toBe('m441');
    expect(result.current.messages.at(-1)?.id).toBe('m520');
    expect(new Set(result.current.messages.map((m) => m.id)).size).toBe(80);
  });

  it('keeps a new live message in the head without inserting it into an anchored old window', async () => {
    const { result, client } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await act(async () => {
      client.setQueryData<InfiniteMessagesData>(
        queryKeys.conversations.messages('history-chat'),
        (old) => ({
          ...old!,
          pages: [{ ...old!.pages[0], data: [message(601), ...old!.pages[0].data] }],
        }),
      );
    });
    await waitFor(() => {
      expect(result.current.isAnchoredInHistory).toBe(true);
    });
    expect(result.current.messages.some((m) => m.id === 'm601')).toBe(false);
  });

  it('resets an old date anchor to the fresh head cursor and preserves pending optimistic rows', async () => {
    const { result, client } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    vi.mocked(chatApi.getMessagesAroundDate).mockResolvedValueOnce({
      data: [message(100), message(99)],
      hasMore: false,
      nextCursor: null,
    });
    await act(async () => {
      await result.current.loadAroundDate('2026-01-01T00:01:40Z');
    });
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m99', 'm100']));
    await act(async () => {
      client.setQueryData<InfiniteMessagesData>(
        queryKeys.conversations.messages('history-chat'),
        (old) => ({
          ...old!,
          pages: [
            {
              ...old!.pages[0],
              data: [
                { ...message(601), id: 'client_pending', status: 'SENDING' },
                ...old!.pages[0].data,
              ],
            },
          ],
        }),
      );
      await result.current.resetToLive();
    });
    await waitFor(() => expect(result.current.isAnchoredInHistory).toBe(false));
    expect(result.current.messages.at(-1)?.id).toBe('client_pending');
    expect(vi.mocked(chatApi.getMessages).mock.calls.at(-1)?.slice(1, 4)).toEqual([
      undefined,
      20,
      undefined,
    ]);
    expect(
      client.getQueryData<InfiniteMessagesData>([
        'conversation-messages',
        'history-chat',
        'history-window',
        'account-a',
      ])?.pages,
    ).toEqual([]);
  });

  it('cancels a superseded jump request and only shows the newest message anchor', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    let firstSignal: AbortSignal | undefined;
    vi.mocked(chatApi.getMessagesAround)
      .mockImplementationOnce((_id, _message, _limit, signal) => {
        firstSignal = signal;
        return new Promise((_, reject) =>
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Cancelled', 'AbortError')),
            { once: true },
          ),
        );
      })
      .mockResolvedValueOnce({
        data: [message(200), message(199)],
        hasMore: false,
        nextCursor: null,
      });
    let firstRequest: Promise<unknown>;
    act(() => {
      firstRequest = result.current.loadAroundMessage('m100').catch((error: unknown) => error);
    });
    await waitFor(() => expect(firstSignal).toBeDefined());
    await act(async () => {
      await result.current.loadAroundMessage('m200');
    });
    expect(firstSignal?.aborted).toBe(true);
    expect(await firstRequest!).toMatchObject({ name: 'AbortError' });
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m199', 'm200']));
    expect(chatApi.getMessagesAround).toHaveBeenLastCalledWith(
      'history-chat',
      'm200',
      20,
      expect.any(AbortSignal),
    );
  });

  it('does not let an old-account in-flight anchor populate the next account window', async () => {
    const { result, client } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    let resolve: (page: Awaited<ReturnType<typeof chatApi.getMessagesAroundDate>>) => void;
    vi.mocked(chatApi.getMessagesAroundDate).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    let request: Promise<unknown>;
    act(() => {
      request = result.current.loadAroundDate('2026-01-01').catch((error: unknown) => error);
    });
    await waitFor(() => expect(chatApi.getMessagesAroundDate).toHaveBeenCalled());
    await act(async () => {
      useAuthStore.setState({ userId: 'account-b' });
      resolve!({ data: [message(100)], hasMore: false, nextCursor: null });
      await request;
    });
    expect(await request!).toMatchObject({ name: 'AbortError' });
    expect(
      client.getQueryData(['conversation-messages', 'history-chat', 'history-window', 'account-a']),
    ).toBeUndefined();
    expect(
      client.getQueryData<InfiniteMessagesData>([
        'conversation-messages',
        'history-chat',
        'history-window',
        'account-b',
      ])?.pages?.length ?? 0,
    ).toBe(0);
    expect([...disk.keys()].some((key) => key.includes('account-b'))).toBe(false);
  });
});
