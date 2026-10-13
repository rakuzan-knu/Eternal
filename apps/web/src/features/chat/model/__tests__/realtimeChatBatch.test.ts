import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRealtimeChatBatch } from '../realtimeChatBatch';

describe('realtime cache batch lifecycle', () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  });
  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
  });

  it('flushes a sustained storm at the bound instead of retaining or dropping events', () => {
    const batch = createRealtimeChatBatch(queryClient);
    const release = batch.retain();
    queryClient.setQueryData(['unread'], 0);
    const values: unknown[] = [];
    queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success')
        values.push(event.query.state.data);
    });
    for (let i = 0; i < 1001; i++)
      batch.enqueue((cache) => cache.setQueryData<number>(['unread'], (count) => (count ?? 0) + 1));
    expect(values).toEqual([500, 1000]);
    expect(queryClient.getQueryData(['unread'])).toBe(1000);
    vi.advanceTimersByTime(50);
    expect(values).toEqual([500, 1000, 1001]);
    release();
  });

  it('does not commit a shared batch when only one of its owners unmounts', () => {
    const batch = createRealtimeChatBatch(queryClient);
    const releaseList = batch.retain();
    const releaseThread = batch.retain();
    batch.enqueue((cache) => cache.setQueryData(['message'], 'received'));
    releaseThread();
    expect(queryClient.getQueryData(['message'])).toBeUndefined();
    releaseList();
    expect(queryClient.getQueryData(['message'])).toBe('received');
    queryClient.clear();
    vi.advanceTimersByTime(50);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('cancels the pending timer and refuses late events after disposal', () => {
    const batch = createRealtimeChatBatch(queryClient);
    const release = batch.retain();
    batch.enqueue((cache) => cache.setQueryData(['message'], 'old account'));
    batch.dispose();
    batch.enqueue((cache) => cache.setQueryData(['message'], 'late event'));
    vi.advanceTimersByTime(50);
    release();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('preserves removal and subsequent recreation order without intermediate commits', () => {
    const batch = createRealtimeChatBatch(queryClient);
    const release = batch.retain();
    queryClient.setQueryData(['messages', 'first'], ['old']);
    queryClient.setQueryData(['messages', 'second'], ['untouched']);
    batch.enqueue((cache) => cache.setQueryData(['messages', 'first'], ['before removal']));
    batch.enqueue((cache) => cache.removeQueries({ queryKey: ['messages', 'first'] }));
    batch.enqueue((cache) => cache.setQueryData(['messages', 'first'], ['after removal']));
    vi.advanceTimersByTime(50);
    expect(queryClient.getQueryData(['messages', 'first'])).toEqual(['after removal']);
    expect(queryClient.getQueryData(['messages', 'second'])).toEqual(['untouched']);
    release();
  });
});
