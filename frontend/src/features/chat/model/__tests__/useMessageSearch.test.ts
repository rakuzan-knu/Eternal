import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMessageSearch } from '../useMessageSearch';
import { chatApi } from '../../api/chatApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    searchMessages: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMessageSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches messages with debounce query', async () => {
    const mockResults = [
      {
        id: 'm1',
        body: 'Found keyword',
        conversationId: 'c1',
        senderId: 'u1',
        createdAt: '2026-01-01',
        reactions: [],
        attachments: [],
      },
    ];
    vi.mocked(chatApi.searchMessages).mockResolvedValue(mockResults as unknown as never);

    const { result } = renderHook(() => useMessageSearch('c1', 'keyword'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.results.length).toBeGreaterThan(0));
    expect(chatApi.searchMessages).toHaveBeenCalledWith('c1', 'keyword');
    expect(result.current.results).toEqual(mockResults);
  });
});
