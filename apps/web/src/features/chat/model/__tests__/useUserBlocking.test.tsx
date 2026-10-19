import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { chatApi, useUserBlockStatus, getUserBlockStatus } from '@/entities/chat';
import { queryKeys } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useBlockUser, useUnblockUser } from '../useConversationMutations';

const target = { id: 'target', username: 'target', displayName: null, avatar: null };

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () => ({
      status: useUserBlockStatus('target'),
      block: useBlockUser(),
      unblock: useUnblockUser(),
    }),
    { wrapper },
  );
  return { ...hook, client };
}

describe('author block cache', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ isAuthenticated: true, userId: 'me' });
    vi.spyOn(chatApi, 'getBlockedUsers').mockResolvedValue([]);
  });

  it('shows pending, updates every observer on confirmed block and permits an unblock', async () => {
    let resolveBlock = (_value: unknown) => {};
    vi.spyOn(chatApi, 'blockUser').mockReturnValue(
      new Promise((resolve) => {
        resolveBlock = resolve;
      }),
    );
    vi.spyOn(chatApi, 'unblockUser').mockResolvedValue(undefined);
    const { result } = setup();
    await waitFor(() => expect(result.current.status.isLoading).toBe(false));
    act(() => result.current.block.mutate('target'));
    await waitFor(() => expect(result.current.status.isPending).toBe(true));
    expect(result.current.status.blockedByMe).toBe(false);
    vi.mocked(chatApi.getBlockedUsers).mockResolvedValue([target]);
    await act(async () => resolveBlock(undefined));
    await waitFor(() => expect(result.current.status.blockedByMe).toBe(true));
    vi.mocked(chatApi.getBlockedUsers).mockResolvedValue([]);
    await act(async () => {
      await result.current.unblock.mutateAsync('target');
    });
    expect(result.current.status.isBlocked).toBe(false);
  });

  it('preserves the authoritative block state if blocking or unblocking fails', async () => {
    vi.spyOn(chatApi, 'blockUser').mockRejectedValue(new Error('Offline'));
    vi.spyOn(chatApi, 'unblockUser').mockRejectedValue(new Error('Offline'));
    const { result, client } = setup();
    await waitFor(() => expect(result.current.status.isLoading).toBe(false));
    await act(async () => {
      await expect(result.current.block.mutateAsync('target')).rejects.toThrow('Offline');
    });
    expect(result.current.status.isBlocked).toBe(false);
    vi.mocked(chatApi.getBlockedUsers).mockResolvedValue([target]);
    act(() => {
      client.setQueryData(queryKeys.conversations.blocked, [target]);
    });
    await act(async () => {
      await expect(result.current.unblock.mutateAsync('target')).rejects.toThrow('Offline');
    });
    expect(result.current.status.blockedByMe).toBe(true);
  });
  it('recognizes an authoritative incoming block from an existing direct conversation', async () => {
    const { result, client } = setup();
    await waitFor(() => expect(result.current.status.isLoading).toBe(false));
    act(() => {
      client.setQueryData(queryKeys.conversations.root, [
        { type: 'DIRECT', blockingMe: true, participants: [{ userId: 'target' }] },
      ]);
    });
    expect(result.current.status.isBlocked).toBe(true);
    expect(result.current.status.blockedByMe).toBe(false);
    act(() => {
      client.setQueryData(queryKeys.conversations.root, [
        { type: 'DIRECT', blockingMe: false, participants: [{ userId: 'target' }] },
      ]);
    });
    expect(result.current.status.isBlocked).toBe(false);
  });
  it('expires a denied relationship marker even when it was restored from persisted cache', () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.conversations.blockState('target'), Date.now() - 1);
    expect(getUserBlockStatus(client, 'target').isBlocked).toBe(false);
  });

  it('re-enables following when the temporary denial expires without another cache event', () => {
    vi.useFakeTimers();
    try {
      useAuthStore.setState({ isAuthenticated: false });
      const { result, client, unmount } = setup();
      act(() => {
        client.setQueryData(queryKeys.conversations.blockState('target'), Date.now() + 30_000);
      });
      expect(result.current.status.isBlocked).toBe(true);
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      expect(result.current.status.isBlocked).toBe(false);
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reconciles a previous denial with newer authoritative chat information', () => {
    vi.useFakeTimers();
    try {
      const client = new QueryClient();
      client.setQueryData(queryKeys.conversations.blockState('target'), Date.now() + 30_000);
      client.setQueryData(queryKeys.conversations.blocked, []);
      expect(getUserBlockStatus(client, 'target').isBlocked).toBe(true);
      vi.advanceTimersByTime(1);
      client.setQueryData(queryKeys.conversations.root, [
        { type: 'DIRECT', blockingMe: false, participants: [{ userId: 'target' }] },
      ]);
      expect(getUserBlockStatus(client, 'target').isBlocked).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not erase a known incoming block when I unblock the same person', async () => {
    vi.spyOn(chatApi, 'unblockUser').mockResolvedValue(undefined);
    const { result, client } = setup();
    await waitFor(() => expect(result.current.status.isLoading).toBe(false));
    act(() => {
      client.setQueryData(queryKeys.conversations.blockState('target'), Date.now() + 30_000);
      client.setQueryData(queryKeys.conversations.blocked, [target]);
    });
    await act(async () => {
      await result.current.unblock.mutateAsync('target');
    });
    expect(result.current.status.blockedByMe).toBe(false);
    expect(result.current.status.isBlocked).toBe(true);
  });
});
