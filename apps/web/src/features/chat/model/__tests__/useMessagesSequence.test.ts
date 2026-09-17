import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMessages } from '../useMessages';
import { chatApi } from '../../api/chatApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { MessageView } from '@/entities/chat/model/types';

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

describe('useMessages Sequence & Out-of-Order Ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('orders messages by clientSeq when createdAt timestamps are identical', async () => {
    const timestamp = '2026-09-01T12:00:00.000Z';
    const mockMessages: Partial<MessageView>[] = [
      {
        id: 'msg-2',
        conversationId: 'conv-1',
        sender: { id: 'usr-1', username: 'alice', displayName: 'Alice', avatar: null },
        body: 'Message 2 (sent second, arrived first)',
        clientSeq: 2,
        createdAt: timestamp,
      },
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        sender: { id: 'usr-1', username: 'alice', displayName: 'Alice', avatar: null },
        body: 'Message 1 (sent first, delayed in transit)',
        clientSeq: 1,
        createdAt: timestamp,
      },
    ];

    vi.mocked(chatApi.getMessages).mockResolvedValue({
      data: mockMessages as MessageView[],
      hasMore: false,
      nextCursor: null,
    });

    const { result } = renderHook(() => useMessages('conv-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].id).toBe('msg-1');
    expect(result.current.messages[0].clientSeq).toBe(1);
    expect(result.current.messages[1].id).toBe('msg-2');
    expect(result.current.messages[1].clientSeq).toBe(2);
  });
});
