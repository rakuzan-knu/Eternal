import { createStore, del, get, set } from 'idb-keyval';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { registerSessionResetHandler } from '@/shared/model/resetSession';
import { POST_FEED_HISTORY_TTL } from './postFeedWindow';

export interface PostFeedStorage {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
}
export interface PostFeedScope {
  accountId: string;
  feed: string;
}
type Token = { generation: number };
type Entry = { key: string; accountId: string; savedAt: number; usedAt: number; bytes: number };
const MANIFEST = 'post-feed-manifest';
export const POST_FEED_MAX_DISK_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 160;

/** Payloads stay on disk; the only in-memory bookkeeping is a generation fence. */
export class PostFeedColdCache {
  private generation = 0;
  private work: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: PostFeedStorage,
    private now = () => Date.now(),
  ) {}
  token(): Token {
    return { generation: this.generation };
  }
  isCurrent(token: Token): boolean {
    return token.generation === this.generation;
  }
  private key(scope: PostFeedScope, cursor: string | undefined) {
    return JSON.stringify([scope.accountId, scope.feed, cursor ?? null]);
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.work.then(operation, operation);
    this.work = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
  async read<Page>(
    scope: PostFeedScope,
    cursor: string | undefined,
    token: Token,
  ): Promise<Page | undefined> {
    try {
      return await this.serial(async () => {
        if (!this.isCurrent(token) || !scope.accountId) return;
        const manifest = (await this.storage.get<Entry[]>(MANIFEST)) ?? [];
        const entry = manifest.find((item) => item.key === this.key(scope, cursor));
        if (!entry || !this.isCurrent(token)) return;
        if (this.now() - entry.savedAt >= POST_FEED_HISTORY_TTL) {
          await this.storage.del(entry.key);
          await this.storage.set(
            MANIFEST,
            manifest.filter((item) => item !== entry),
          );
          return;
        }
        const page = await this.storage.get<Page>(entry.key);
        if (!this.isCurrent(token)) return;
        entry.usedAt = this.now();
        await this.storage.set(MANIFEST, manifest);
        return this.isCurrent(token) ? page : undefined;
      });
    } catch {
      return;
    }
  }
  async write<Page>(
    scope: PostFeedScope,
    cursor: string | undefined,
    page: Page,
    token: Token,
  ): Promise<void> {
    if (!scope.accountId || !this.isCurrent(token)) return;
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(page)).byteLength;
      if (bytes > POST_FEED_MAX_DISK_BYTES) return;
      await this.serial(async () => {
        if (!this.isCurrent(token)) return;
        const previous = (await this.storage.get<Entry[]>(MANIFEST)) ?? [];
        if (!this.isCurrent(token)) return;
        const key = this.key(scope, cursor);
        const now = this.now();
        const manifest = previous.filter(
          (entry) => entry.key !== key && now - entry.savedAt < POST_FEED_HISTORY_TTL,
        );
        const removed = previous.filter((entry) => entry.key !== key && !manifest.includes(entry));
        manifest.push({ key, accountId: scope.accountId, bytes, savedAt: now, usedAt: now });
        manifest.sort((a, b) => a.usedAt - b.usedAt);
        let total = manifest.reduce((sum, entry) => sum + entry.bytes, 0);
        while (manifest.length > MAX_ENTRIES || total > POST_FEED_MAX_DISK_BYTES) {
          const entry = manifest.shift()!;
          total -= entry.bytes;
          removed.push(entry);
        }
        for (const entry of removed) await this.storage.del(entry.key);
        if (!this.isCurrent(token)) return;
        try {
          await this.storage.set(key, page);
          if (!this.isCurrent(token)) {
            await this.storage.del(key);
            return;
          }
          await this.storage.set(MANIFEST, manifest);
        } catch {
          await this.storage.del(key).catch(() => {});
        }
      });
    } catch {
      /* Browsing can replay REST cursors when disk is unavailable/full. */
    }
  }
  invalidate(accountId?: string): Promise<void> {
    // Synchronous fencing prevents a pending read/write from restoring pre-mutation data.
    this.generation++;
    return this.serial(async () => {
      const manifest = (await this.storage.get<Entry[]>(MANIFEST)) ?? [];
      for (const entry of manifest.filter((item) => !accountId || item.accountId === accountId)) {
        await this.storage.del(entry.key);
      }
      await this.storage.set(
        MANIFEST,
        accountId ? manifest.filter((entry) => entry.accountId !== accountId) : [],
      );
    }).catch(() => {});
  }
}
const store = createStore('post-feed-history-v1', 'pages');
export const postFeedColdCache = new PostFeedColdCache({
  get: <T>(key: string) => get<T>(key, store),
  set: (key, value) => set(key, value, store),
  del: (key) => del(key, store),
});
export function invalidatePostFeedHistory(): void {
  void postFeedColdCache.invalidate(useAuthStore.getState().userId ?? undefined);
}
registerSessionResetHandler(() => {
  void postFeedColdCache.invalidate();
});
