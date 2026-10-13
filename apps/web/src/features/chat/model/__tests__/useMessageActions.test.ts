import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageActions } from '../useMessageActions';
import { chatApi } from '../../api/chatApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { CONVERSATION_MESSAGES_KEY } from '@/shared/api/queryKeys';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    sendMessage: vi.fn(),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    pinMessage: vi.fn(),
    unpinMessage: vi.fn(),
    batchForwardMessages: vi.fn(),
    getMessagesAround: vi.fn(),
    getMessagesAroundDate: vi.fn(),
    getMessages: vi.fn(),
  },
}));

describe('useMessageActions', () => {
  it('forwards a batch to multiple target conversations', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATION_MESSAGES_KEY, 'conv-1'], {
      pages: [
        {
          data: [{ id: 'm1', body: 'First', createdAt: '2026-08-28T12:00:00Z' }],
          hasMore: true,
          nextCursor: 'cur-1',
        },
      ],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    // 1. batchForwardMessages
    vi.mocked(chatApi.batchForwardMessages).mockResolvedValueOnce({ success: true } as any);
    await act(async () => {
      await result.current.batchForwardMessages(['m1'], ['conv-2', 'conv-3'], true);
    });
    expect(chatApi.batchForwardMessages).toHaveBeenCalledWith(
      'conv-1',
      ['m1'],
      ['conv-2', 'conv-3'],
      true,
    );
  });
});
