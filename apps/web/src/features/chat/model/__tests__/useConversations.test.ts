import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConversations } from '../useConversations';
import { chatApi } from '../../api/chatApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    getConversations: vi.fn(),
    getConversationsPage: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches conversations when authenticated', async () => {
    useAuthStore.setState({ isAuthenticated: true, userId: 'u1' });
    const mockConversations = [{ id: 'conv-1', title: 'General' }];
    vi.mocked(chatApi.getConversationsPage).mockResolvedValue({
      data: mockConversations,
      hasMore: false,
      nextCursor: null,
      order: 'activityAt',
    } as never);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockConversations);
    expect(chatApi.getConversations).not.toHaveBeenCalled();
  });

  it('appends older matching dialogs on demand and deduplicates overlapping responses', async () => {
    useAuthStore.setState({ isAuthenticated: true, userId: 'u1' });
    vi.mocked(chatApi.getConversationsPage)
      .mockResolvedValueOnce({
        data: [{ id: 'a' }],
        hasMore: true,
        nextCursor: 'cursor-1',
        order: 'activityAt',
      } as never)
      .mockResolvedValueOnce({
        data: [{ id: 'a' }, { id: 'old' }],
        hasMore: false,
        nextCursor: null,
        order: 'activityAt',
      } as never);
    const { result } = renderHook(() => useConversations({ search: 'old', filter: 'GROUPS' }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((c) => c.id)).toEqual(['a']);
    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.data?.map((c) => c.id)).toEqual(['a', 'old']));
    expect(chatApi.getConversationsPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'cursor-1', search: 'old', filter: 'GROUPS', limit: 25 }),
      expect.any(AbortSignal),
    );
  });
});
