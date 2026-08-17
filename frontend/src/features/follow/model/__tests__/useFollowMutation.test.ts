import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFollowMutation } from '../useFollowMutation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { USER_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { followApi } from '../../api/followApi';
import React from 'react';

describe('useFollowMutation', () => {
  it('optimistically updates following status and count', async () => {
    vi.spyOn(followApi, 'follow').mockResolvedValue({ success: true } as unknown as {
      success: boolean;
    });
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
      await result.current.mutateAsync();
    });

    const updatedTarget = queryClient.getQueryData<{
      id: string;
      isFollowing: boolean;
      followersCount: number;
    }>([USER_KEY, 'target-user']);

    expect(updatedTarget?.isFollowing).toBe(true);
    expect(updatedTarget?.followersCount).toBe(11);
  });
});
