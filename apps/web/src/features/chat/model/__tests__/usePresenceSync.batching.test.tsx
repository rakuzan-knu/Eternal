import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { resetSessionStores } from '@/shared/model/resetSession';
import { usePresenceSync } from '../usePresence';
import { useAuthStore } from '@/shared/model/useAuthStore';

const transport = vi.hoisted(() => {
  const listeners = new Map<string, Set<(payload?: any) => void>>();
  return {
    on: (event: string, callback: (payload?: any) => void) => {
      const callbacks = listeners.get(event) ?? new Set();
      callbacks.add(callback);
      listeners.set(event, callbacks);
    },
    off: (event: string, callback: (payload?: any) => void) =>
      listeners.get(event)?.delete(callback),
    receive: (event: string, payload?: unknown) =>
      [...(listeners.get(event) ?? [])].forEach((callback) => callback(payload)),
    reset: () => listeners.clear(),
  };
});
vi.mock('../useChatSocket', () => ({ useChatSocket: () => transport }));
vi.mock('@/shared/api/idbPersister', () => ({ idbPersister: { removeClient: async () => {} } }));

describe('presence state batching', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    vi.useFakeTimers();
    transport.reset();
    queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    usePresenceStore.setState({ onlineUserIds: new Set(), userActivities: {} });
    useAuthStore.setState({ userId: 'original-account', isAuthenticated: true });
  });
  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
  });

  it('publishes a burst once with the last status and activity for each user', () => {
    renderHook(() => usePresenceSync(), { wrapper });
    let publications = 0;
    const unsubscribe = usePresenceStore.subscribe(() => {
      publications += 1;
    });
    act(() => {
      for (let i = 0; i < 100; i++) transport.receive('userOnline', { userId: `user-${i}` });
      for (let i = 0; i < 50; i++) transport.receive('userOffline', { userId: `user-${i}` });
      transport.receive('user:activity:changed', {
        userId: 'user-1',
        activityStatus: { type: 'gaming', title: 'Game' },
      });
      transport.receive('userOnline', { userId: 'user-1' });
    });
    expect(publications).toBe(0);
    act(() => vi.advanceTimersByTime(50));
    expect(publications).toBe(1);
    expect(usePresenceStore.getState().onlineUserIds.size).toBe(51);
    expect(usePresenceStore.getState().onlineUserIds.has('user-0')).toBe(false);
    expect(usePresenceStore.getState().userActivities['user-1']).toEqual({
      type: 'gaming',
      title: 'Game',
    });
    unsubscribe();
  });

  it('coalesces server presence batches with individual transitions into one publication', () => {
    renderHook(() => usePresenceSync(), { wrapper });
    let publications = 0;
    const unsubscribe = usePresenceStore.subscribe(() => {
      publications += 1;
    });
    act(() => {
      transport.receive('userOnline', { userId: 'alice' });
      transport.receive('presence:batch', { online: ['bob'], offline: ['alice'] });
      vi.advanceTimersByTime(50);
    });
    expect(publications).toBe(1);
    expect([...usePresenceStore.getState().onlineUserIds]).toEqual(['bob']);
    unsubscribe();
  });

  it('publishes one large authoritative server batch atomically', () => {
    renderHook(() => usePresenceSync(), { wrapper });
    let publications = 0;
    const unsubscribe = usePresenceStore.subscribe(() => {
      publications += 1;
    });
    act(() => {
      transport.receive('presence:batch', {
        online: Array.from({ length: 1000 }, (_, i) => `user-${i}`),
      });
      vi.advanceTimersByTime(50);
    });
    expect(publications).toBe(1);
    expect(usePresenceStore.getState().onlineUserIds.size).toBe(1000);
    unsubscribe();
  });

  it('flushes on disconnect and cancels ephemeral updates on unmount', () => {
    const { unmount } = renderHook(() => usePresenceSync(), { wrapper });
    act(() => {
      transport.receive('userOnline', { userId: 'received' });
      transport.receive('disconnect');
    });
    expect(usePresenceStore.getState().onlineUserIds.has('received')).toBe(true);
    act(() => transport.receive('userOnline', { userId: 'pending' }));
    unmount();
    act(() => vi.advanceTimersByTime(50));
    expect(usePresenceStore.getState().onlineUserIds.has('pending')).toBe(false);
  });

  it('disposes the buffer at session reset before disconnect can publish old presence', () => {
    renderHook(() => usePresenceSync(), { wrapper });
    act(() => {
      transport.receive('userOnline', { userId: 'old' });
      resetSessionStores();
      transport.receive('userOnline', { userId: 'late' });
      transport.receive('disconnect');
      vi.advanceTimersByTime(50);
    });
    expect(usePresenceStore.getState().onlineUserIds.size).toBe(0);
  });

  it('rebinds presence for an account switch without remounting the application', () => {
    renderHook(() => usePresenceSync(), { wrapper });
    act(() => {
      transport.receive('userOnline', { userId: 'old-contact' });
      resetSessionStores();
      useAuthStore.setState({ userId: 'next-account' });
    });
    act(() => {
      transport.receive('userOnline', { userId: 'new-contact' });
      vi.advanceTimersByTime(50);
    });
    expect([...usePresenceStore.getState().onlineUserIds]).toEqual(['new-contact']);
  });
});
