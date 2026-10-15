import { createStore, del, get, set } from 'idb-keyval';
import { registerSessionResetHandler } from '@/shared/model/resetSession';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { HISTORY_CACHE_TTL, type HistoryPage, type HistoryPageParam } from './historyWindow';

export interface HistoryScope {
  accountId: string;
  conversationId: string;
}
export interface HistoryStorage {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
}
type CacheToken = { session: number; revision: number; scope: string };
type Entry = { key: string; scope: string; savedAt: number; usedAt: number; bytes: number };
const MANIFEST = 'history-page-manifest';
const MAX_ENTRIES = 160;
const MAX_BYTES = 8 * 1024 * 1024;

/** Only metadata lives in the manifest; message payloads stay in IndexedDB. */
export class HistoryColdCache {
  private session = 0;
  private revisions = new Map<string, number>();
  private pendingInvalidations = new Map<string, Promise<void>>();
  private work: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: HistoryStorage,
    private now = () => Date.now(),
  ) {}
  token(scope: HistoryScope): CacheToken {
    const id = JSON.stringify([scope.accountId, scope.conversationId]);
    return { session: this.session, revision: this.revisions.get(id) ?? 0, scope: id };
  }
  isCurrent(token: CacheToken): boolean {
    return (
      token.session === this.session && token.revision === (this.revisions.get(token.scope) ?? 0)
    );
  }
  private serial<T>(task: () => Promise<T>): Promise<T> {
    const next = this.work.then(task, task);
    this.work = next.catch(() => {});
    return next;
  }
  private key(scope: HistoryScope, request: HistoryPageParam) {
    return JSON.stringify([
      scope.accountId,
      scope.conversationId,
      request.direction,
      request.cursor ?? null,
    ]);
  }
  async read(
    scope: HistoryScope,
    request: HistoryPageParam,
    token: CacheToken,
  ): Promise<HistoryPage | undefined> {
    if (!this.isCurrent(token)) return;
    try {
      return await this.serial(async () => {
        if (!this.isCurrent(token)) return;
        const manifest = (await this.storage.get<Entry[]>(MANIFEST)) ?? [];
        if (!this.isCurrent(token)) return;
        const entry = manifest.find((e) => e.key === this.key(scope, request));
        if (!entry) return;
        if (this.now() - entry.savedAt >= HISTORY_CACHE_TTL) {
          await this.storage.del(entry.key);
          await this.storage.set(
            MANIFEST,
            manifest.filter((e) => e !== entry),
          );
          return;
        }
        const page = await this.storage.get<HistoryPage>(entry.key);
        if (!this.isCurrent(token) || !page?.cacheable) return;
        entry.usedAt = this.now();
        await this.storage.set(MANIFEST, manifest);
        return this.isCurrent(token) ? page : undefined;
      });
    } catch {
      return;
    }
  }
  async write(
    scope: HistoryScope,
    request: HistoryPageParam,
    page: HistoryPage,
    token: CacheToken,
  ): Promise<void> {
    if (!page.cacheable || !this.isCurrent(token)) return;
    const bytes = new TextEncoder().encode(JSON.stringify(page)).byteLength;
    if (bytes > MAX_BYTES) return;
    try {
      await this.serial(async () => {
        if (!this.isCurrent(token)) return;
        const previous = (await this.storage.get<Entry[]>(MANIFEST)) ?? [];
        if (!this.isCurrent(token)) return;
        const key = this.key(scope, request);
        const now = this.now();
        const manifest = previous.filter(
          (e) => e.key !== key && now - e.savedAt < HISTORY_CACHE_TTL,
        );
        const removed = previous.filter((e) => e.key !== key && !manifest.includes(e));
        manifest.push({ key, scope: token.scope, savedAt: now, usedAt: now, bytes });
        manifest.sort((a, b) => a.usedAt - b.usedAt);
        let total = manifest.reduce((sum, e) => sum + e.bytes, 0);
        while (manifest.length > MAX_ENTRIES || total > MAX_BYTES) {
          const old = manifest.shift()!;
          total -= old.bytes;
          removed.push(old);
        }
        for (const old of removed) await this.storage.del(old.key);
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
      /* Unavailable/quota-limited IDB must not block REST browsing. */
    }
  }
  invalidate(scope: HistoryScope): Promise<void> {
    const id = JSON.stringify([scope.accountId, scope.conversationId]);
    if (this.revisions.size >= MAX_ENTRIES && !this.revisions.has(id)) {
      this.session++;
      this.revisions.clear();
    }
    this.revisions.set(id, (this.revisions.get(id) ?? 0) + 1);
    // Revisions advance synchronously for every event. The disk cleanup
    // needs to run once per scope until its current operation completes.
    const pending = this.pendingInvalidations.get(id);
    if (pending) return pending;
    const cleanup = this.serial(async () => {
      const manifest = (await this.storage.get<Entry[]>(MANIFEST)) ?? [];
      for (const entry of manifest.filter((e) => e.scope === id)) await this.storage.del(entry.key);
      await this.storage.set(
        MANIFEST,
        manifest.filter((e) => e.scope !== id),
      );
    })
      .catch(() => {})
      .finally(() => {
        if (this.pendingInvalidations.get(id) === cleanup) this.pendingInvalidations.delete(id);
      });
    this.pendingInvalidations.set(id, cleanup);
    return cleanup;
  }
  clear(): Promise<void> {
    this.session++;
    this.revisions.clear();
    this.pendingInvalidations.clear();
    return this.serial(async () => {
      const manifest = (await this.storage.get<Entry[]>(MANIFEST)) ?? [];
      for (const entry of manifest) await this.storage.del(entry.key);
      await this.storage.del(MANIFEST);
    }).catch(() => {});
  }
}
const store = createStore('chat-history-pages-v1', 'pages');
export const historyColdCache = new HistoryColdCache({
  get: <T>(key: string) => get<T>(key, store),
  set: (key, value) => set(key, value, store),
  del: (key) => del(key, store),
});
/** Revision changes synchronously, before a queued query patch is published. */
export function invalidateHistoryConversation(
  id: string,
  accountId = useAuthStore.getState().userId,
): void {
  if (accountId) void historyColdCache.invalidate({ accountId, conversationId: id });
}
registerSessionResetHandler(() => {
  void historyColdCache.clear();
});
