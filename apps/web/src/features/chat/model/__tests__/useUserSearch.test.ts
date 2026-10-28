import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserSearch } from '../useUserSearch';
import { userSearchApi } from '@/entities/user/api/userSearchApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/entities/user/api/userSearchApi', () => ({
  userSearchApi: {
    search: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useUserSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches users when query is valid and debounces search input', async () => {
    const mockUsers = [{ id: 'u1', username: 'bob', displayName: 'Bob', avatar: null }];
    vi.mocked(userSearchApi.search).mockResolvedValue(mockUsers as unknown as never);

    const { result } = renderHook(() => useUserSearch('@bob'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(userSearchApi.search).toHaveBeenCalledWith('bob', expect.any(AbortSignal));
  });

  it('distinguishes a failed search from no matches and supports retry', async () => {
    vi.mocked(userSearchApi.search)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([]);
    const { result } = renderHook(() => useUserSearch('alice'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.retry();
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.results).toEqual([]);
  });
});
