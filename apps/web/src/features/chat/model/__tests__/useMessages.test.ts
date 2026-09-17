import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMessages } from '../useMessages';
import { chatApi } from '../../api/chatApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    getMessages: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches infinite messages for conversation and handles hasMore / nextCursor pagination', async () => {
    const mockPage1 = {
      data: [
        {
          id: 'm1',
          body: 'Msg 1',
          conversationId: 'c1',
          senderId: 'u1',
          createdAt: '2026-01-01',
          reactions: [],
          attachments: [],
        },
      ],
      hasMore: true,
      nextCursor: 'cursor-page-2',
    };
    const mockPage2 = {
      data: [
        {
          tempId: 'temp-2',
          body: 'Msg 2',
          conversationId: 'c1',
          senderId: 'u1',
          createdAt: '2026-01-02',
          reactions: [],
          attachments: [],
        },
        {
          id: 'm1', // Duplicate m1 to test deduplication
          body: 'Msg 1 duplicate',
          conversationId: 'c1',
          senderId: 'u1',
          createdAt: '2026-01-01',
          reactions: [],
          attachments: [],
        },
        {
          clientMessageId: 'client-3',
          body: 'Msg 3',
          conversationId: 'c1',
          senderId: 'u1',
          createdAt: '2026-01-03',
          reactions: [],
          attachments: [],
        },
      ],
      hasMore: false,
      nextCursor: null,
    };

    vi.mocked(chatApi.getMessages)
      .mockResolvedValueOnce(mockPage1 as unknown as never)
      .mockResolvedValueOnce(mockPage2 as unknown as never);

    const { result } = renderHook(() => useMessages('c1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() => expect(result.current.messages).toHaveLength(3));
  });

  it('returns empty array when query data is not available', () => {
    const { result } = renderHook(() => useMessages(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.messages).toEqual([]);
  });

  it('handles getNextPageParam when hasMore is true but nextCursor is undefined/null', async () => {
    const mockPage = {
      data: [{ id: 'm-single', body: 'Solo', conversationId: 'c2', createdAt: '2026-01-01' }],
      hasMore: true,
      nextCursor: null,
    };
    vi.mocked(chatApi.getMessages).mockResolvedValueOnce(mockPage as any);

    const { result } = renderHook(() => useMessages('c2'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});
