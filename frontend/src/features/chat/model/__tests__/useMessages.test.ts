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

  it('fetches infinite messages for conversation', async () => {
    const mockPage = {
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
      hasMore: false,
      nextCursor: null,
    };
    vi.mocked(chatApi.getMessages).mockResolvedValue(mockPage as unknown as never);

    const { result } = renderHook(() => useMessages('c1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.messages).toHaveLength(1);
    expect(chatApi.getMessages).toHaveBeenCalledWith('c1', undefined);
  });
});
