import { hashKey, notifyManager, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { registerSessionResetHandler } from '@/shared/model/resetSession';

export type ChatCacheClient = Pick<QueryClient, 'getQueryData' | 'setQueryData' | 'removeQueries'> &
  Partial<Pick<QueryClient, 'getQueriesData'>>;

const BATCH_WINDOW_MS = 50;
const MAX_PENDING_EVENTS = 500;

interface StagedQuery {
  key: QueryKey;
  initial: unknown;
  value: unknown;
  removed: boolean;
}

export interface RealtimeChatBatch {
  enqueue: (update: (cache: ChatCacheClient) => void) => void;
  invalidate: (key: QueryKey) => void;
  flush: () => void;
  cancel: () => void;
  dispose: () => void;
  retain: () => () => void;
}

const sharedBatches = new WeakMap<
  QueryClient,
  { userId: string | null; batch: RealtimeChatBatch }
>();
const liveBatches = new Set<RealtimeChatBatch>();

/**
 * Reduce ordered socket events outside React. A burst commits each query once,
 * preserving all unread increments and message transitions rather than keeping
 * only the last callback. At most 500 reducers live for one 50 ms window.
 */
export function createRealtimeChatBatch(queryClient: QueryClient): RealtimeChatBatch {
  const staged = new Map<string, StagedQuery>();
  const invalidations = new Map<string, QueryKey>();
  let updates: Array<(cache: ChatCacheClient) => void> = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let flushing = false;
  let owners = 0;
  let disposed = false;

  const read = (key: QueryKey): unknown => {
    const entry = staged.get(hashKey(key));
    return entry ? (entry.removed ? undefined : entry.value) : queryClient.getQueryData(key);
  };
  const cache: ChatCacheClient = {
    getQueryData: read as ChatCacheClient['getQueryData'],
    getQueriesData: ((filters) =>
      queryClient
        .getQueriesData(filters)
        .map(([key]) => [key, read(key)])) as QueryClient['getQueriesData'],
    setQueryData: ((key: QueryKey, updater: unknown) => {
      const current = read(key);
      const value = typeof updater === 'function' ? updater(current) : updater;
      // TanStack Query treats an undefined result as a no-op, not deletion.
      if (value === undefined) return undefined;
      const hash = hashKey(key);
      const previous = staged.get(hash);
      staged.set(hash, {
        key,
        initial: previous ? previous.initial : queryClient.getQueryData(key),
        value,
        removed: false,
      });
      return value;
    }) as ChatCacheClient['setQueryData'],
    removeQueries: (filters) => {
      for (const query of queryClient.getQueryCache().findAll(filters)) {
        staged.set(query.queryHash, {
          key: query.queryKey,
          initial: query.state.data,
          value: undefined,
          removed: true,
        });
      }
      for (const entry of staged.values()) {
        const prefix = filters?.queryKey;
        if (!prefix || hashKey(entry.key.slice(0, prefix.length)) === hashKey(prefix)) {
          entry.removed = true;
          entry.value = undefined;
        }
      }
    },
  };

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    staged.clear();
    invalidations.clear();
    updates = [];
  };
  const flush = () => {
    if (disposed) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    const received = updates;
    updates = [];
    // Read fresh cache data now, so a REST response received during the window
    // is preserved instead of being overwritten by an earlier snapshot.
    flushing = true;
    try {
      received.forEach((update) => update(cache));
    } finally {
      flushing = false;
    }
    const entries = [...staged.values()];
    const keys = [...invalidations.values()];
    staged.clear();
    invalidations.clear();
    notifyManager.batch(() => {
      for (const entry of entries) {
        if (entry.removed) queryClient.removeQueries({ queryKey: entry.key, exact: true });
        else if (entry.value !== entry.initial) queryClient.setQueryData(entry.key, entry.value);
      }
      // Invalidation follows all writes: a known dialog arriving later in the
      // same burst must not make an incomplete conversation list look fresh.
      keys.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
    });
  };
  const schedule = () => {
    if (flushing) return;
    if (updates.length >= MAX_PENDING_EVENTS) flush();
    else if (timer === undefined) timer = setTimeout(flush, BATCH_WINDOW_MS);
  };
  const batch: RealtimeChatBatch = {
    enqueue: (update) => {
      if (disposed || owners === 0) return;
      updates.push(update);
      schedule();
    },
    invalidate: (key) => {
      if (disposed || owners === 0) return;
      invalidations.set(hashKey(key), key);
      schedule();
    },
    flush,
    cancel,
    dispose: () => {
      cancel();
      disposed = true;
      liveBatches.delete(batch);
      if (sharedBatches.get(queryClient)?.batch === batch) sharedBatches.delete(queryClient);
    },
    retain: () => {
      owners += 1;
      liveBatches.add(batch);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        owners -= 1;
        if (owners === 0) {
          flush();
          cancel();
          liveBatches.delete(batch);
        }
      };
    },
  };
  return batch;
}

export function getRealtimeChatBatch(
  queryClient: QueryClient,
  userId: string | null,
): RealtimeChatBatch {
  const existing = sharedBatches.get(queryClient);
  if (existing?.userId === userId) return existing.batch;
  const batch = createRealtimeChatBatch(queryClient);
  sharedBatches.set(queryClient, { userId, batch });
  return batch;
}

/** Local optimistic actions and reconnect cursors need the received state first. */
export function flushRealtimeChatBatch(queryClient: QueryClient): void {
  sharedBatches.get(queryClient)?.batch.flush();
}

registerSessionResetHandler(() => {
  // Session reset cancels rather than flushes, so cleared data stays cleared.
  [...liveBatches].forEach((batch) => batch.dispose());
});
