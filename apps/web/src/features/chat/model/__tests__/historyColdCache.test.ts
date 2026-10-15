import { describe, expect, it, vi } from 'vitest';
import { HistoryColdCache, type HistoryStorage } from '../historyColdCache';
import type { HistoryPage } from '../historyWindow';

function storage() {
  const values = new Map<string, unknown>();
  const driver: HistoryStorage = {
    get: async <T>(key: string) => values.get(key) as T | undefined,
    set: async (key, value) => {
      values.set(key, structuredClone(value));
    },
    del: async (key) => {
      values.delete(key);
    },
  };
  return { values, driver };
}

const scope = { accountId: 'account-a', conversationId: 'chat-a' };
const request = { direction: 'before' as const, cursor: 'm100' };
const page = {
  data: [{ id: 'm99', body: 'historical', createdAt: '2026-01-01T00:00:00Z' }],
  hasMore: true,
  nextCursor: 'm99',
  hasOlder: true,
  hasNewer: true,
  cacheable: true,
} as HistoryPage;

describe('cold chat history', () => {
  it('restores only the matching account/conversation and expires after five minutes', async () => {
    const disk = storage();
    let now = 1000;
    const cache = new HistoryColdCache(disk.driver, () => now);
    await cache.write(scope, request, page, cache.token(scope));
    expect((await cache.read(scope, request, cache.token(scope)))?.data[0].body).toBe('historical');
    expect(
      await cache.read(
        { ...scope, accountId: 'account-b' },
        request,
        cache.token({ ...scope, accountId: 'account-b' }),
      ),
    ).toBeUndefined();
    expect(
      await cache.read(
        { ...scope, conversationId: 'chat-b' },
        request,
        cache.token({ ...scope, conversationId: 'chat-b' }),
      ),
    ).toBeUndefined();
    now += 300001;
    expect(await cache.read(scope, request, cache.token(scope))).toBeUndefined();
  });

  it('invalidates an edited conversation before queued reads can restore an old row', async () => {
    const disk = storage();
    const cache = new HistoryColdCache(disk.driver);
    const oldToken = cache.token(scope);
    await cache.write(scope, request, page, oldToken);
    const clearing = cache.invalidate(scope);
    expect(await cache.read(scope, request, oldToken)).toBeUndefined();
    await clearing;
    await cache.write(scope, request, page, oldToken);
    expect(await cache.read(scope, request, cache.token(scope))).toBeUndefined();
  });

  it('coalesces a mutation storm into one physical cleanup while invalidating each old token immediately', async () => {
    const disk = storage();
    const read = vi.spyOn(disk.driver, 'get');
    const cache = new HistoryColdCache(disk.driver);
    const token = cache.token(scope);
    await cache.write(scope, request, page, token);
    read.mockClear();
    const pending: Promise<void>[] = [];
    for (let n = 0; n < 1000; n++) {
      const before = cache.token(scope);
      pending.push(cache.invalidate(scope));
      expect(cache.isCurrent(before)).toBe(false);
    }
    await Promise.all(pending);
    expect(read).toHaveBeenCalledTimes(1);
    expect(await cache.read(scope, request, cache.token(scope))).toBeUndefined();
  });

  it('a session reset prevents a delayed old-session write from repopulating storage', async () => {
    const disk = storage();
    const cache = new HistoryColdCache(disk.driver);
    const token = cache.token(scope);
    const write = cache.write(scope, request, page, token);
    const reset = cache.clear();
    await Promise.all([write, reset]);
    await cache.write(scope, request, page, token);
    expect(await cache.read(scope, request, cache.token(scope))).toBeUndefined();
    expect(disk.values.size).toBe(0);
  });

  it('evicts least recently used responses while retaining only a bounded metadata manifest', async () => {
    const disk = storage();
    let now = 0;
    const cache = new HistoryColdCache(disk.driver, () => now);
    for (let n = 0; n < 165; n++) {
      now++;
      await cache.write(scope, { direction: 'before', cursor: `m${n}` }, page, cache.token(scope));
    }
    expect(
      await cache.read(scope, { direction: 'before', cursor: 'm0' }, cache.token(scope)),
    ).toBeUndefined();
    expect(
      (await cache.read(scope, { direction: 'before', cursor: 'm164' }, cache.token(scope)))
        ?.data[0].id,
    ).toBe('m99');
    expect(disk.values.size).toBeLessThanOrEqual(161);
    const manifest = [...disk.values.values()].find(Array.isArray) as unknown[];
    expect(manifest.length).toBeLessThanOrEqual(160);
    expect(JSON.stringify(manifest)).not.toContain('historical');
  });

  it('does not persist a single oversized historical response', async () => {
    const disk = storage();
    const cache = new HistoryColdCache(disk.driver);
    const huge = { ...page, data: [{ ...page.data[0], body: 'x'.repeat(9 * 1024 * 1024) }] };
    await cache.write(scope, request, huge, cache.token(scope));
    expect(await cache.read(scope, request, cache.token(scope))).toBeUndefined();
  });
});
