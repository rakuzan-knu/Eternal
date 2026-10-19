import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFollowMutation } from '../useFollowMutation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { USER_KEY, USER_BY_USERNAME_KEY, FEED_KEY, FOLLOW_LIST_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { queryKeys } from '@/shared/api/queryKeys';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { chatApi } from '@/entities/chat';
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
    expect(useMessageToastStore.getState().toasts[0]?.title).toBe('Action Failed');
    expect(useMessageToastStore.getState().toasts[0]?.body).toBe(
      'Failed to update follow status. Please try again.',
    );
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
  it('prevents an already blocked follow before API or optimistic changes', async () => {
    const follow = vi.spyOn(followApi, 'follow').mockResolvedValue(undefined);
    follow.mockClear();
    const client = new QueryClient();
    client.setQueryData(queryKeys.conversations.blocked, [{ id: 'target', username: 'target' }]);
    client.setQueryData([USER_KEY, 'target'], { id: 'target', isFollowing: false });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useFollowMutation('target', false), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('Following is unavailable');
    });
    expect(follow).not.toHaveBeenCalled();
    expect(client.getQueryData([USER_KEY, 'target'])).toEqual({ id: 'target', isFollowing: false });
    expect(useMessageToastStore.getState().toasts[0]?.title).toBe('Following unavailable');
  });

  it('explains an authoritative reverse block and prevents subsequent follow attempts', async () => {
    vi.spyOn(chatApi, 'getBlockedUsers').mockResolvedValue([]);
    const blocked = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: {
        status: 403,
        data: { message: 'Cannot follow user: relationship is in BLOCKED state' },
      },
    });
    const follow = vi.spyOn(followApi, 'follow').mockRejectedValue(blocked);
    follow.mockClear();
    const client = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useFollowMutation('target', false), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('Following is unavailable');
    });
    expect(
      client.getQueryData<number>(queryKeys.conversations.blockState('target')),
    ).toBeGreaterThan(Date.now());
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('Following is unavailable');
    });
    expect(follow).toHaveBeenCalledTimes(1);
    expect(useMessageToastStore.getState().toasts[0]?.title).toBe('Following unavailable');
  });
  it('does not mistake other authorization errors for a blocked relationship', async () => {
    const forbidden = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: { status: 403, data: { message: 'Forbidden resource' } },
    });
    vi.spyOn(followApi, 'follow').mockRejectedValue(forbidden);
    const client = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useFollowMutation('target', false), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('Forbidden');
    });
    expect(client.getQueryData(queryKeys.conversations.blockState('target'))).toBeUndefined();
    expect(useMessageToastStore.getState().toasts[0]?.title).toBe('Action Failed');
  });
  it('refreshes an own block from another tab without leaving a reverse-block marker after unblock', async () => {
    vi.spyOn(chatApi, 'getBlockedUsers').mockResolvedValue([
      { id: 'target', username: 'target', avatar: null, displayName: null },
    ]);
    const blocked = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: {
        status: 403,
        data: { message: 'Cannot follow user: relationship is in BLOCKED state' },
      },
    });
    const follow = vi
      .spyOn(followApi, 'follow')
      .mockRejectedValueOnce(blocked)
      .mockResolvedValue(undefined);
    const client = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useFollowMutation('target', false), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('Following is unavailable');
    });
    expect(client.getQueryData(queryKeys.conversations.blockState('target'))).toBeUndefined();
    expect(client.getQueryData(queryKeys.conversations.blocked)).toEqual([
      { id: 'target', username: 'target', avatar: null, displayName: null },
    ]);
    client.setQueryData(queryKeys.conversations.blocked, []);
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(follow).toHaveBeenCalled();
  });
});
