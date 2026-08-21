import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFollowList } from '../useFollowList';
import { followApi } from '../../api/followApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/followApi', () => ({
  followApi: {
    getFollowers: vi.fn(),
    getFollowing: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useFollowList', () => {
  it('fetches followers infinite query when mode is followers', async () => {
    const mockPage = { items: [], nextCursor: undefined, hasMore: false };
    vi.mocked(followApi.getFollowers).mockResolvedValue(mockPage);

    const { result } = renderHook(() => useFollowList('u1', 'followers'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(followApi.getFollowers).toHaveBeenCalledWith('u1', undefined);
  });

  it('fetches following infinite query when mode is following', async () => {
    const mockPage = { items: [], nextCursor: undefined, hasMore: false };
    vi.mocked(followApi.getFollowing).mockResolvedValue(mockPage);

    const { result } = renderHook(() => useFollowList('u1', 'following'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(followApi.getFollowing).toHaveBeenCalledWith('u1', undefined);
  });
});
