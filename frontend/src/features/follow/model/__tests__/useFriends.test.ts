import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFriends } from '../useFriends';
import { followApi, FollowUserSummary } from '../../api/followApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/followApi', () => ({
  followApi: {
    getFriends: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useFriends', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: null, isAuthenticated: false });
    vi.clearAllMocks();
  });

  it('stays idle when unauthenticated', () => {
    const { result } = renderHook(() => useFriends(), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches friends list when authenticated', async () => {
    useAuthStore.setState({ userId: 'u1', isAuthenticated: true });
    const mockFriends: FollowUserSummary[] = [
      {
        id: 'f1',
        username: 'friend1',
        displayName: 'Friend One',
        avatar: null,
        isFollowing: true,
        followsYou: true,
        isFriend: true,
      },
    ];
    vi.mocked(followApi.getFriends).mockResolvedValue(mockFriends);

    const { result } = renderHook(() => useFriends(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockFriends);
  });
});
