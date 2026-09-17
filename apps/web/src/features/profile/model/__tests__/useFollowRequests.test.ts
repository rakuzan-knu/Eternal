import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useFollowRequests,
  useFollowRequestsCount,
  useRespondToFollowRequest,
} from '../useFollowRequests';
import { followRequestsApi } from '../../api/followRequestsApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/followRequestsApi', () => ({
  followRequestsApi: {
    list: vi.fn(),
    count: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
  },
}));

describe('useFollowRequests hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    useAuthStore.setState({ userId: 'u1', isAuthenticated: true });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('fetches list and count of follow requests', async () => {
    vi.mocked(followRequestsApi.list).mockResolvedValue({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });
    vi.mocked(followRequestsApi.count).mockResolvedValue(5 as unknown as never);

    const { result: listResult } = renderHook(() => useFollowRequests(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    const { result: countResult } = renderHook(() => useFollowRequestsCount(), { wrapper });
    await waitFor(() => expect(countResult.current.isSuccess).toBe(true));
  });

  it('accepts and rejects follow requests', async () => {
    vi.mocked(followRequestsApi.accept).mockResolvedValue({ success: true } as unknown as never);
    vi.mocked(followRequestsApi.reject).mockResolvedValue({ success: true } as unknown as never);

    const { result } = renderHook(() => useRespondToFollowRequest(), { wrapper });

    result.current.accept.mutate('follower-1');
    await waitFor(() => expect(result.current.accept.isSuccess).toBe(true));
    expect(followRequestsApi.accept).toHaveBeenCalledWith('follower-1');

    result.current.reject.mutate('follower-2');
    await waitFor(() => expect(result.current.reject.isSuccess).toBe(true));
    expect(followRequestsApi.reject).toHaveBeenCalledWith('follower-2');
  });
});
