import { QueryClient, QueryCache, MutationCache, replaceEqualDeep } from '@tanstack/react-query';
import { idbPersister } from './idbPersister';

/**
 * Enterprise TanStack Query v5 client.
 *
 * Server State policy (single source of truth):
 * - ALL REST reads/writes go through TanStack Query (`useQuery`,
 *   `useInfiniteQuery`, `useMutation`). Direct `apiClient` calls are allowed
 *   ONLY inside `queryFn`/`mutationFn` or realtime gap-fill helpers that
 *   immediately write back via `setQueryData`.
 * - Cache keys come ONLY from `@/shared/api/queryKeys` factory.
 * - `structuralSharing` via `replaceEqualDeep` keeps referential stability so
 *   identical server payloads never cause rerenders.
 * - `staleTime` / `gcTime` are tuned per domain (see presets below):
 *   profiles are cache-friendly (5 min), chats are realtime (0 ms).
 */

// ─── Per-domain freshness policy ─────────────────────────────────────────────
// staleTime: how long data is considered fresh (no background refetch).
// gcTime: how long unused data stays in RAM before garbage collection.
export const queryStaleTimes = {
  /** User/profile/showcase data: rarely changes → 5 minutes fresh. */
  profile: 1000 * 60 * 5,
  /** Social feed: moderately dynamic → 60 seconds. */
  feed: 1000 * 60,
  /** Chat messages/conversations: realtime via WS → always stale (0). */
  chat: 0,
  /** Conversation list: WS-driven, short freshness for ordering. */
  conversations: 1000 * 30,
  /** Notifications: poll lightly → 30 seconds. */
  notifications: 1000 * 30,
  /** Stories/reels: ephemeral → 60 seconds. */
  stories: 1000 * 60,
  /** Search results: highly dynamic → 10 seconds. */
  search: 1000 * 10,
  /** Default fallback. */
  default: 1000 * 30,
} as const;

export const queryGcTimes = {
  /** Profiles stay in RAM longer for instant navigation. */
  profile: 1000 * 60 * 30,
  /** Chat buffers stay briefly; history is re-fetched via cursor. */
  chat: 1000 * 60 * 5,
  /** Default RAM retention. */
  default: 1000 * 60 * 5,
} as const;

/**
 * Structural sharing: deep-compare server payloads and reuse previous
 * references when equal. Prevents rerenders on identical responses
 * (e.g. polling, refetch on reconnect, WS echo of own message).
 */
export function structuralShare<T>(previous: T | undefined, next: T): T {
  if (previous === undefined) return next;
  return replaceEqualDeep(previous, next);
}

function reportQueryError(error: unknown): void {
  // Route to Sentry when available; never throw from cache callbacks.
  try {
    const w = globalThis as { Sentry?: { captureException?: (e: unknown) => void } };
    w.Sentry?.captureException?.(error);
  } catch {
    // noop — observability must never break the app
  }
  if (import.meta.env.DEV) {
    console.error('[query] unhandled error', error);
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => reportQueryError(error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => reportQueryError(error),
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Refetch stale queries on reconnect — complements WS gap-fill
      // (WS applies the delta instantly, TQ reconciles in background).
      refetchOnReconnect: true,
      // Offline-first: keep cached data usable while offline; mutations
      // pause and retry instead of failing outright.
      networkMode: 'offlineFirst',
      staleTime: queryStaleTimes.default,
      gcTime: queryGcTimes.default,
      structuralSharing: structuralShare,
    },
    mutations: {
      // Mutations (esp. chat sends) must NOT auto-retry: duplicates
      // would create double messages. Callers retry explicitly with
      // idempotency keys (see httpClient X-Idempotency-Key).
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * Enterprise persistence configuration for TanStack Query v5 with IndexedDB.
 * Retains successful queries for up to 7 days offline.
 */
export const offlinePersistOptions = {
  persister: idbPersister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  buster: 'v1.0.0',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { state: { status: string } }) => {
      return query.state.status === 'success';
    },
  },
};
