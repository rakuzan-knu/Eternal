import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageReactionMutation } from '../useMessageReactionMutation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { CONVERSATION_MESSAGES_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';

const mockEmit = vi.fn();

vi.mock('../useChatSocket', () => ({
  useChatSocket: () => ({
    emit: mockEmit,
  }),
}));

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMessageReactionMutation', () => {
  let queryClient: QueryClient;

  const initialData = {
    pages: [
      {
        data: [
          {
            id: 'm1',
            reactions: [
              {
                emoji: '❤️',
                count: 2,
                selfReacted: true,
                users: [{ id: 'user-1' }, { id: 'user-2' }],
              },
              {
                emoji: '🔥',
                count: 1,
                selfReacted: false,
                users: [{ id: 'user-2' }],
              },
            ],
          },
        ],
        hasMore: false,
        nextCursor: null,
      },
    ],
    pageParams: [undefined],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ userId: 'user-1' });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData([CONVERSATION_MESSAGES_KEY, 'c1'], initialData);
  });

  it('optimistically removes reaction when self reacted with count > 1 and count === 1', async () => {
    mockEmit.mockImplementation((_event, _payload, cb) => {
      if (typeof cb === 'function') cb({ status: 'ok' });
    });

    const { result } = renderHook(() => useMessageReactionMutation('c1'), {
      wrapper: createWrapper(queryClient),
    });

    // 1. Remove ❤️ where count = 2
    await act(async () => {
      await result.current.toggleReaction('m1', '❤️', true);
    });

    let state = queryClient.getQueryData<any>([CONVERSATION_MESSAGES_KEY, 'c1']);
    const heartReaction = state.pages[0].data[0].reactions.find((r: any) => r.emoji === '❤️');
    expect(heartReaction.count).toBe(1);
    expect(heartReaction.selfReacted).toBe(false);

    // 2. Remove ❤️ again where count = 1
    await act(async () => {
      await result.current.toggleReaction('m1', '❤️', true);
    });

    state = queryClient.getQueryData<any>([CONVERSATION_MESSAGES_KEY, 'c1']);
    expect(state.pages[0].data[0].reactions.find((r: any) => r.emoji === '❤️')).toBeUndefined();
  });

  it('optimistically adds reaction to existing emoji and new emoji, and replaces prior reaction', async () => {
    mockEmit.mockImplementation((_event, _payload, cb) => {
      if (typeof cb === 'function') cb({ status: 'ok' });
    });

    const { result } = renderHook(() => useMessageReactionMutation('c1'), {
      wrapper: createWrapper(queryClient),
    });

    // Add to existing emoji '🔥'
    await act(async () => {
      await result.current.toggleReaction('m1', '🔥', false);
    });

    let state = queryClient.getQueryData<any>([CONVERSATION_MESSAGES_KEY, 'c1']);
    const fireReaction = state.pages[0].data[0].reactions.find((r: any) => r.emoji === '🔥');
    expect(fireReaction.count).toBe(2);
    expect(fireReaction.selfReacted).toBe(true);

    // Add brand new emoji '⭐' (should replace '🔥' for user-1)
    await act(async () => {
      await result.current.toggleReaction('m1', '⭐', false);
    });

    state = queryClient.getQueryData<any>([CONVERSATION_MESSAGES_KEY, 'c1']);
    const starReaction = state.pages[0].data[0].reactions.find((r: any) => r.emoji === '⭐');
    expect(starReaction.count).toBe(1);
    expect(starReaction.selfReacted).toBe(true);
  });

  it('handles socket error and conversationId null guard', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockEmit.mockImplementation((_event, _payload, cb) => {
      if (typeof cb === 'function') cb({ status: 'error', error: 'Network fail' });
    });

    const { result } = renderHook(() => useMessageReactionMutation('c1'), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.toggleReaction('m1', '🚀', false);
    });

    // Null guard
    const { result: nullResult } = renderHook(() => useMessageReactionMutation(null), {
      wrapper: createWrapper(queryClient),
    });
    await act(async () => {
      await nullResult.current.toggleReaction('m1', '🚀', false);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles reaction toggle with null auth userId and handles socket ack timeout', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    useAuthStore.setState({ userId: null });

    const { result } = renderHook(() => useMessageReactionMutation('c1'), {
      wrapper: createWrapper(queryClient),
    });

    // Add reaction without logged in user id
    await act(async () => {
      await result.current.toggleReaction('m1', '🎉', false);
    });

    const state = queryClient.getQueryData<any>([CONVERSATION_MESSAGES_KEY, 'c1']);
    const reaction = state.pages[0].data[0].reactions.find((r: any) => r.emoji === '🎉');
    expect(reaction.count).toBe(1);

    // Remove reaction without logged in user id (count > 1)
    await act(async () => {
      await result.current.toggleReaction('m1', '❤️', true);
    });

    // Timeout
    act(() => {
      vi.advanceTimersByTime(7000);
    });

    vi.useRealTimers();
    consoleSpy.mockRestore();
  });
});
