import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFollowBack } from '../useFollowBack';
import { useNotificationStore } from '@/entities/notification';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { followApi } from '../../api/followApi';

vi.mock('../../api/followApi', () => ({
  followApi: {
    follow: vi.fn().mockResolvedValue({ success: true }),
    unfollow: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('useFollowBack hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({ optimisticFollows: {}, unreadCounts: undefined });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it('useFollowBack toggles follow and unfollow with optimistic state', async () => {
    const { result } = renderHook(() => useFollowBack(), { wrapper: createWrapper() });

    expect(result.current.isFollowing('user-x', false)).toBe(false);

    await act(async () => {
      result.current.toggleFollow('user-x', false);
    });

    expect(followApi.follow).toHaveBeenCalledWith('user-x');

    await act(async () => {
      result.current.toggleFollow('user-x', true);
    });

    expect(followApi.unfollow).toHaveBeenCalledWith('user-x');
  });

  it('useFollowBack handles mutation error rollback and rapid click guard', async () => {
    vi.mocked(followApi.follow).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useFollowBack(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.toggleFollow('user-err', false);
    });

    expect(result.current.isFollowing('user-err', false)).toBe(false);
  });

  it('useFollowBack guards against rapid clicks when already loading', () => {
    useNotificationStore.getState().setOptimisticFollow('user-loading', true, true);
    const { result } = renderHook(() => useFollowBack(), { wrapper: createWrapper() });

    expect(result.current.isLoading('user-loading')).toBe(true);

    act(() => {
      result.current.toggleFollow('user-loading', false);
    });

    expect(followApi.follow).not.toHaveBeenCalled();
    expect(followApi.unfollow).not.toHaveBeenCalled();
  });

  it('covers toggleFollow guards rapid clicks when loading, and targetState from current', async () => {
    const { result } = renderHook(() => useFollowBack(), { wrapper: createWrapper() });

    // 1. Guard when loading
    act(() => {
      useNotificationStore.getState().setOptimisticFollow('user-z', false, true);
    });
    expect(result.current.isLoading('user-z')).toBe(true);

    act(() => {
      result.current.toggleFollow('user-z', false);
    });
    expect(followApi.follow).not.toHaveBeenCalled();

    // 2. targetState taken from current when current is defined
    act(() => {
      useNotificationStore.getState().setOptimisticFollow('user-z', true, false);
    });
    await act(async () => {
      result.current.toggleFollow('user-z', false);
    });
    // Target was true, so unfollow should be called
    expect(followApi.unfollow).toHaveBeenCalledWith('user-z');
  });
});
