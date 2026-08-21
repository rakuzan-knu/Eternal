import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSuggestedUsers, useDismissSuggestedUser } from '../useSuggestedUsers';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { apiClient as api } from '@/shared/api/httpClient';
import { followApi } from '@/features/follow/api/followApi';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('@/features/follow/api/followApi', () => ({
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
});
