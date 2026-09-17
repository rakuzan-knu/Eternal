import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSuggestedUsers, useDismissSuggestedUser } from '../useSuggestedUsers';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { apiClient as api } from '@/shared/api/httpClient';
import { followApi } from '../../api/followApi';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('../../api/followApi', () => ({
  followApi: {
    dismissSuggestedUser: vi.fn(),
  },
}));

describe('useSuggestedUsers & useDismissSuggestedUser', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    useAuthStore.setState({ isAuthenticated: true });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('fetches and maps suggested users', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 'u-1',
          username: 'alice',
          displayName: 'Alice S',
          avatar: null,
          bio: 'Hello',
          isFollowing: false,
          followsYou: true,
          isFriend: false,
          isVerified: true,
        },
      ],
    });

    const { result } = renderHook(() => useSuggestedUsers(5), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].username).toBe('alice');
    expect(result.current.data![0].displayName).toBe('Alice S');
    expect(result.current.data![0].isVerified).toBe(true);
  });

  it('dismisses a suggested user optimistically', async () => {
    vi.mocked(followApi.dismissSuggestedUser).mockResolvedValueOnce(undefined as any);

    queryClient.setQueryData(
      ['suggestedUsers', 5],
      [
        { id: 'u-1', username: 'alice' },
        { id: 'u-2', username: 'bob' },
      ],
    );

    const { result } = renderHook(() => useDismissSuggestedUser(), { wrapper });

    result.current.mutate('u-1');

    await waitFor(() => expect(followApi.dismissSuggestedUser).toHaveBeenCalledWith('u-1'));
  });

  it('rolls back optimistic dismiss on error', async () => {
    vi.mocked(followApi.dismissSuggestedUser).mockRejectedValueOnce(new Error('Failed to dismiss'));

    const initialUsers = [
      { id: 'u-1', username: 'alice' },
      { id: 'u-2', username: 'bob' },
    ];
    queryClient.setQueryData(['suggestedUsers', 5], initialUsers);

    const { result } = renderHook(() => useDismissSuggestedUser(), { wrapper });

    result.current.mutate('u-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(['suggestedUsers', 5])).toEqual(initialUsers);
  });

  it('handles non-array response and item default fallbacks', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: undefined,
          username: undefined,
          displayName: undefined,
          avatar: undefined,
          bio: undefined,
        },
      ],
    });

    const { result } = renderHook(() => useSuggestedUsers(3), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].username).toBe('user');
    expect(result.current.data![0].displayName).toBe('User');

    // non-array
    vi.mocked(api.get).mockResolvedValueOnce({ data: null });
    const { result: r2 } = renderHook(() => useSuggestedUsers(4), { wrapper });
    await waitFor(() => expect(r2.current.isSuccess).toBe(true));
    expect(r2.current.data).toEqual([]);
  });

  it('handles empty query cache during dismiss mutation gracefully', async () => {
    vi.mocked(followApi.dismissSuggestedUser).mockResolvedValueOnce(undefined as any);

    // No cache initialized
    const { result } = renderHook(() => useDismissSuggestedUser(), { wrapper });
    result.current.mutate('u-any');

    await waitFor(() => expect(followApi.dismissSuggestedUser).toHaveBeenCalledWith('u-any'));
  });
});
