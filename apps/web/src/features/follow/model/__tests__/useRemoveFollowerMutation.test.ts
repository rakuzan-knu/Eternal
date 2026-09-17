import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRemoveFollowerMutation } from '../useRemoveFollowerMutation';
import { followApi } from '../../api/followApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/followApi', () => ({
  followApi: {
    removeFollower: vi.fn(),
  },
}));

describe('useRemoveFollowerMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('executes remove follower mutation and optimistic updates', async () => {
    vi.mocked(followApi.removeFollower).mockResolvedValue({ success: true });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useRemoveFollowerMutation('profile-1'), { wrapper });

    result.current.mutate('follower-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(followApi.removeFollower).toHaveBeenCalledWith('follower-1');
  });
});
