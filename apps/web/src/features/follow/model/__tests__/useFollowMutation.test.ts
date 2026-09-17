import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFollowMutation } from '../useFollowMutation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { USER_KEY, USER_BY_USERNAME_KEY, FEED_KEY, FOLLOW_LIST_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { followApi } from '../../api/followApi';
import React from 'react';

describe('useFollowMutation', () => {
  it('optimistically updates following status and count when following', async () => {
    vi.spyOn(followApi, 'follow').mockResolvedValue({ success: true } as any);
    useAuthStore.setState({ userId: 'me' });
    const queryClient = new QueryClient();

    queryClient.setQueryData([USER_KEY, 'target-user'], {
      id: 'target-user',
      isFollowing: false,
      followersCount: 10,
    });

    queryClient.setQueryData([USER_BY_USERNAME_KEY, 'target'], {
      id: 'target-user',
      isFollowing: false,
      followersCount: 10,
    });

    queryClient.setQueryData([FEED_KEY], {
      pages: [{ posts: [{ id: 'p1', authorId: 'target-user', isFollowing: false }] }],
    });

    queryClient.setQueryData([FOLLOW_LIST_KEY], {
      pages: [{ items: [{ id: 'target-user', isFollowing: false }] }],
    });

    queryClient.setQueryData(['suggestedUsers'], [{ id: 'target-user', isFollowing: false }]);

    queryClient.setQueryData(['miniProfile'], {
      id: 'target-user',
      isFollowing: false,
      followersCount: 10,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useFollowMutation('target-user', false), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const updatedTarget = queryClient.getQueryData<any>([USER_KEY, 'target-user']);
    expect(updatedTarget?.isFollowing).toBe(true);
    expect(updatedTarget?.followersCount).toBe(11);

    const updatedFeed = queryClient.getQueryData<any>([FEED_KEY]);
    expect(updatedFeed.pages[0].posts[0].isFollowing).toBe(true);
  });

  it('optimistically updates caches when unfollowing and handles rollback on error', async () => {
    vi.spyOn(followApi, 'unfollow').mockRejectedValue(new Error('Network error'));
    useAuthStore.setState({ userId: 'me' });
    const queryClient = new QueryClient();

    queryClient.setQueryData([USER_KEY, 'target-user'], {
      id: 'target-user',
      isFollowing: true,
      followersCount: 10,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useFollowMutation('target-user', true), {
      wrapper,
    });

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // Handled
      }
    });

    // Rolled back to true
    const rolledBack = queryClient.getQueryData<any>([USER_KEY, 'target-user']);
    expect(rolledBack?.isFollowing).toBe(true);
  });

  it('updates currentUser followingCount and removes user from currentUser following list on unfollow', async () => {
    vi.spyOn(followApi, 'unfollow').mockResolvedValue({ success: true } as any);
    useAuthStore.setState({ userId: 'me' });
    const queryClient = new QueryClient();

    queryClient.setQueryData([USER_KEY, 'me'], {
      id: 'me',
      followingCount: 5,
    });

    queryClient.setQueryData([FOLLOW_LIST_KEY, 'me', 'following'], {
      pages: [{ items: [{ id: 'target-user', isFollowing: true }] }],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useFollowMutation('target-user', true), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const myProfile = queryClient.getQueryData<any>([USER_KEY, 'me']);
    expect(myProfile?.followingCount).toBe(4);

    const myFollowingList = queryClient.getQueryData<any>([FOLLOW_LIST_KEY, 'me', 'following']);
    expect(myFollowingList?.pages[0].items).toHaveLength(0);
  });

  it('handles 409 Conflict idempotently without rolling back', async () => {
    const error409 = Object.assign(new Error('Already following'), {
      response: { status: 409 },
    });
    vi.spyOn(followApi, 'follow').mockRejectedValue(error409);
    useAuthStore.setState({ userId: 'me' });
    const queryClient = new QueryClient();

    queryClient.setQueryData([USER_KEY, 'target-user'], {
      id: 'target-user',
      isFollowing: false,
      followersCount: 10,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useFollowMutation('target-user', false), {
      wrapper,
    });

    await act(async () => {
      await expect(result.current.mutateAsync()).resolves.toBeUndefined();
    });

    const updatedTarget = queryClient.getQueryData<any>([USER_KEY, 'target-user']);
    expect(updatedTarget?.isFollowing).toBe(true);
    expect(updatedTarget?.followersCount).toBe(11);
  });
});
