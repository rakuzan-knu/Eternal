import { describe, it, expect } from 'vitest';
import { queryClient, queryStaleTimes, queryGcTimes, structuralShare } from '../queryClient';

describe('queryClient enterprise defaults', () => {
  it('keeps safe query defaults (retry 1, no focus refetch)', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('refetches on reconnect and works offline-first', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchOnReconnect).toBe(true);
    expect(defaults.queries?.networkMode).toBe('offlineFirst');
  });

  it('never auto-retries mutations (chat sends are idempotent-only)', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(0);
  });

  it('exposes per-domain staleTime policy (profiles 5min, chats 0)', () => {
    expect(queryStaleTimes.profile).toBe(1000 * 60 * 5);
    expect(queryStaleTimes.chat).toBe(0);
    expect(queryStaleTimes.conversations).toBe(1000 * 30);
    expect(queryStaleTimes.notifications).toBe(1000 * 30);
  });

  it('exposes gcTime policy for RAM cleanup', () => {
    expect(queryGcTimes.profile).toBe(1000 * 60 * 30);
    expect(queryGcTimes.chat).toBe(1000 * 60 * 5);
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(queryGcTimes.default);
  });

  it('structuralSharing reuses previous references for identical payloads', () => {
    const prev = { a: 1, nested: { b: [1, 2, 3] } };
    const next = { a: 1, nested: { b: [1, 2, 3] } };
    const shared = structuralShare(prev, next);
    expect(shared).toBe(prev);

    const changed = { a: 2, nested: { b: [1, 2, 3] } };
    const reshared = structuralShare(prev, changed);
    expect(reshared).not.toBe(prev);
    expect(reshared).toEqual(changed);
    // Unchanged subtree keeps its reference (no child rerenders).
    expect((reshared as typeof prev).nested).toBe(prev.nested);
  });
});
