import { describe, expect, it } from 'vitest';
import {
  PostFeedColdCache,
  POST_FEED_MAX_DISK_BYTES,
  type PostFeedStorage,
} from '../postFeedColdCache';
import { PostFeedWindow, POST_FEED_HISTORY_TTL } from '../postFeedWindow';

function storage() {
  const values = new Map<string, unknown>();
  const adapter: PostFeedStorage = {
    get: async <T>(key: string) => structuredClone(values.get(key)) as T | undefined,
    set: async (key, value) => {
      values.set(key, structuredClone(value));
    },
    del: async (key) => {
      values.delete(key);
    },
  };
  return { values, adapter };
}
const scope = { accountId: 'account-a', feed: '["feed"]' };
const page = {
  posts: [
    {
      id: 'post-1',
      text: 'Before edit',
      media: [
        { type: 'image', url: '/media/one.webp' },
        { type: 'video', url: '/media/one.mp4', poster: '/media/one.webp' },
      ],
    },
  ],
  nextCursor: 'post-1',
};
describe('post feed disk history', () => {
  it('isolates accounts and expires full post payloads after the TTL', async () => {
    const { adapter, values } = storage();
    let now = 100;
    const cache = new PostFeedColdCache(adapter, () => now);
    await cache.write(scope, undefined, page, cache.token());
    expect(
      await cache.read({ ...scope, accountId: 'account-b' }, undefined, cache.token()),
    ).toBeUndefined();
    now += POST_FEED_HISTORY_TTL;
    expect(await cache.read(scope, undefined, cache.token())).toBeUndefined();
    expect(values.has(JSON.stringify(['account-a', '["feed"]', null]))).toBe(false);
  });
  it('evicts older snapshots when media metadata would exceed the byte budget', async () => {
    const { adapter } = storage();
    let now = 0;
    const cache = new PostFeedColdCache(adapter, () => now++);
    const largePage = { ...page, metadata: 'x'.repeat(POST_FEED_MAX_DISK_BYTES / 2 + 100) };
    await cache.write(scope, 'older', largePage, cache.token());
    await cache.write(scope, 'newer', largePage, cache.token());
    expect(await cache.read(scope, 'older', cache.token())).toBeUndefined();
    expect(await cache.read(scope, 'newer', cache.token())).toEqual(largePage);
  });
  it('fences pending reads and late writes when a mutation or session reset invalidates history', async () => {
    const { adapter } = storage();
    const cache = new PostFeedColdCache(adapter);
    await cache.write(scope, undefined, page, cache.token());
    const oldToken = cache.token();
    const pendingRead = cache.read(scope, undefined, oldToken);
    const invalidated = cache.invalidate();
    expect(await pendingRead).toBeUndefined();
    await invalidated;
    await cache.write(scope, undefined, page, oldToken);
    expect(await cache.read(scope, undefined, cache.token())).toBeUndefined();
  });
  it('cleans an orphan payload if updating the disk manifest exceeds quota', async () => {
    const { adapter, values } = storage();
    const cache = new PostFeedColdCache({
      ...adapter,
      set: async (key, value) => {
        if (key === 'post-feed-manifest')
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        await adapter.set(key, value);
      },
    });
    await cache.write(scope, undefined, page, cache.token());
    expect(values.size).toBe(0);
  });
});

describe('bounded feed layout metadata', () => {
  it('keeps cursor metadata bounded while retaining a recipe for evicted predecessors', () => {
    const window = new PostFeedWindow();
    for (let index = 0; index < 300; index++)
      window.remember(index === 0 ? undefined : String(index), 10, String(index + 1));
    expect(window.pages.length).toBeLessThanOrEqual(256);
    expect(window.start('299')).toBe(2990);
    expect(window.previous('45')).toBe('__post_feed_replay_44');
    expect(window.count).toBe(3000);
  });
  it('bounds measured row heights without retaining any post or media objects', () => {
    const window = new PostFeedWindow();
    for (let index = 0; index < 3000; index++) window.heights.set(index, 720);
    expect(window.heights.size).toBeLessThanOrEqual(2048);
    expect(window.heights.get(2999)).toBe(720);
  });
});
