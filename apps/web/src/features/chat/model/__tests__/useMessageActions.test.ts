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
  it('returns action functions and executes batchForward, loadAround, loadAroundDate, and loadOlderMessages', async () => {
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

    // 2. loadAroundMessages
    vi.mocked(chatApi.getMessagesAround).mockResolvedValueOnce({
      data: [{ id: 'm2', body: 'Around msg', createdAt: '2026-08-28T12:01:00Z' }],
      hasMore: false,
    } as any);
    await act(async () => {
      await result.current.loadAroundMessages('m1');
    });
    expect(chatApi.getMessagesAround).toHaveBeenCalledWith('conv-1', 'm1');

    // 3. loadAroundDate
    vi.mocked(chatApi.getMessagesAroundDate).mockResolvedValueOnce({
      data: [{ id: 'm3', body: 'Date msg', createdAt: '2026-08-28T12:02:00Z' }],
      hasMore: false,
    } as any);
    await act(async () => {
      await result.current.loadAroundDate('2026-08-28T12:02:00Z');
    });
    expect(chatApi.getMessagesAroundDate).toHaveBeenCalledWith('conv-1', '2026-08-28T12:02:00Z');

    // 4. loadOlderMessages
    vi.mocked(chatApi.getMessages).mockResolvedValueOnce({
      data: [{ id: 'm4', body: 'Older msg', createdAt: '2026-08-28T11:50:00Z' }],
      hasMore: false,
      nextCursor: null,
    } as any);
    await act(async () => {
      await result.current.loadOlderMessages('m1');
    });
    expect(chatApi.getMessages).toHaveBeenCalledWith('conv-1', 'm1', 50);

    const cached: any = queryClient.getQueryData([CONVERSATION_MESSAGES_KEY, 'conv-1']);
    expect(cached.pages[0].data.some((m: any) => m.id === 'm4')).toBe(true);
  });
});
