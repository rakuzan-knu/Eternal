import { get, set, del } from 'idb-keyval';
import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client';

export const DEFAULT_IDB_CACHE_KEY = 'sn_tanstack_query_cache_v1';

/**
 * Enterprise IndexedDB Persister for TanStack Query v5 using idb-keyval.
 * Asynchronously syncs query cache into browser IndexedDB for offline-first resilience.
 */
export function createIdbPersister(idbKey: string = DEFAULT_IDB_CACHE_KEY): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(idbKey, client);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[OfflinePersist] Failed to save query cache to IndexedDB:', error);
        }
      }
    },
    restoreClient: async () => {
      try {
        return await get<PersistedClient>(idbKey);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[OfflinePersist] Failed to restore query cache from IndexedDB:', error);
        }
        return undefined;
      }
    },
    removeClient: async () => {
      try {
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
