import { get, set, del } from 'idb-keyval';
import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client';
import { boundPersistedClient } from './queryPersistencePolicy';

export const DEFAULT_IDB_CACHE_KEY = 'sn_tanstack_query_cache_v1';

/**
 * Enterprise IndexedDB Persister for TanStack Query v5 using idb-keyval.
 * Asynchronously syncs query cache into browser IndexedDB for offline-first resilience.
 */
export function createIdbPersister(idbKey: string = DEFAULT_IDB_CACHE_KEY): Persister {
  let pending: PersistedClient | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writing: Promise<void> | undefined;
  const flush = async () => {
    timer = undefined;
    if (writing || !pending) return;
    const client = boundPersistedClient(pending);
    pending = undefined;
    writing = set(idbKey, client).catch((error: unknown) => {
      if (import.meta.env.DEV) console.warn('[OfflinePersist] Failed to save query cache:', error);
    });
    await writing;
    writing = undefined;
    // A slow IDB transaction retains only one next snapshot, never a queue.
    if (pending && timer === undefined) timer = setTimeout(() => void flush(), 1000);
  };
  return {
    persistClient: (client: PersistedClient) => {
      pending = client;
      if (timer === undefined && !writing) timer = setTimeout(() => void flush(), 1000);
    },
    restoreClient: async () => {
      try {
        const client = await get<PersistedClient>(idbKey);
        return client ? boundPersistedClient(client) : undefined;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[OfflinePersist] Failed to restore query cache from IndexedDB:', error);
        }
        return undefined;
      }
    },
    removeClient: async () => {
      pending = undefined;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      try {
        // Logout must win over an already running transaction.
        await writing;
        await del(idbKey);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[OfflinePersist] Failed to remove query cache from IndexedDB:', error);
        }
      }
    },
  };
}

export const idbPersister = createIdbPersister();
