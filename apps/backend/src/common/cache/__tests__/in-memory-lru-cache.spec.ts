import { InMemoryLruCache } from '../in-memory-lru-cache';

describe('InMemoryLruCache (Degraded Fallback Cache)', () => {
  it('sets and retrieves items correctly in O(1)', () => {
    const cache = new InMemoryLruCache<string, string>({ maxSize: 100 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('non_existent')).toBe(false);
    expect(cache.size).toBe(2);
  });

  it('evicts the least recently used item when maxSize is reached', () => {
    const cache = new InMemoryLruCache<string, number>({ maxSize: 10 }); // minimum size is 10
    for (let i = 1; i <= 10; i++) {
      cache.set(`k${i}`, i);
    }

    // Access k1 to make it most recently used
    expect(cache.get('k1')).toBe(1);

    // Add 11th item: should evict k2 (least recently used)
    cache.set('k11', 11);

    expect(cache.has('k1')).toBe(true);
    expect(cache.has('k2')).toBe(false); // evicted
    expect(cache.get('k11')).toBe(11);

    const stats = cache.getStats();
    expect(stats.evictions).toBe(1);
    expect(stats.size).toBe(10);
  });

  it('respects TTL and returns undefined for expired items', async () => {
    const cache = new InMemoryLruCache<string, string>({ maxSize: 100, defaultTtlSeconds: 1 });
    cache.set('quick', 'val', 0.05); // 50ms TTL

    expect(cache.get('quick')).toBe('val');

    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(cache.get('quick')).toBeUndefined();
    expect(cache.has('quick')).toBe(false);
  });

  it('prunes expired items correctly', async () => {
    const cache = new InMemoryLruCache<string, string>({ maxSize: 100 });
    cache.set('exp1', 'val1', 0.04);
    cache.set('exp2', 'val2', 0.04);
    cache.set('live', 'val3', 60);

    await new Promise((resolve) => setTimeout(resolve, 60));

    const pruned = cache.pruneExpired();
    expect(pruned).toBe(2);
    expect(cache.size).toBe(1);
    expect(cache.has('live')).toBe(true);
  });

  it('clears all items and resets head/tail', () => {
    const cache = new InMemoryLruCache<string, string>({ maxSize: 100 });
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('tracks degraded state and stats accurately', () => {
    const cache = new InMemoryLruCache<string, string>({ maxSize: 100 });
    expect(cache.isDegraded()).toBe(false);

    cache.setDegraded(true);
    expect(cache.isDegraded()).toBe(true);

    const stats = cache.getStats();
    expect(stats.isDegraded).toBe(true);
    expect(stats.degradedSince).toBeDefined();

    cache.setDegraded(false);
    expect(cache.isDegraded()).toBe(false);
  });

  it('deletes keys matching a wildcard pattern', () => {
    const cache = new InMemoryLruCache<string, string>({ maxSize: 100 });
    cache.set('following:usr-1:10:first:usr-1', 'val1');
    cache.set('following:usr-1:20:cursor:usr-1', 'val2');
    cache.set('following:usr-2:10:first:usr-2', 'val3');
    cache.set('user:usr-1', 'val4');

    const deleted = cache.deleteByPattern('following:usr-1:*');
    expect(deleted).toBe(2);
    expect(cache.has('following:usr-1:10:first:usr-1')).toBe(false);
    expect(cache.has('following:usr-1:20:cursor:usr-1')).toBe(false);
    expect(cache.has('following:usr-2:10:first:usr-2')).toBe(true);
    expect(cache.has('user:usr-1')).toBe(true);
  });
});
