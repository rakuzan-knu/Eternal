import type { PersistedClient } from '@tanstack/react-query-persist-client';

export const OFFLINE_MAX_QUERIES = 64;
export const OFFLINE_MAX_PAGES = 3;
export const OFFLINE_MAX_QUERY_CHARS = 256 * 1024;
export const OFFLINE_MAX_CACHE_CHARS = 2 * 1024 * 1024;

export function isPersistableQuery(query: {
  queryKey: readonly unknown[];
  state: { status: string };
}) {
  const root = String(query.queryKey[0] ?? '').toLowerCase();
  return query.state.status === 'success' && !root.includes('search') && root !== 'checkusername';
}

/** Bound the disk snapshot without evicting an active screen's scroll window.
 * Paused mutations are preserved in full: dropping offline writes would lose user data.
 * Character budgets also avoid restoring huge inline media payloads into RAM.
 */
export function boundPersistedClient(client: PersistedClient): PersistedClient {
  let chars = 0;
  const queries: PersistedClient['clientState']['queries'] = [];
  const recent = [...client.clientState.queries].sort(
    (a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt,
  );
  for (const query of recent) {
    if (!isPersistableQuery(query) || queries.length >= OFFLINE_MAX_QUERIES) continue;
    const data = query.state.data;
    let compact = query;
    if (
      data &&
      typeof data === 'object' &&
      'pages' in data &&
      'pageParams' in data &&
      Array.isArray(data.pages) &&
      Array.isArray(data.pageParams)
    ) {
      compact = {
        ...query,
        state: {
          ...query.state,
          data: {
            ...data,
            pages: data.pages.slice(0, OFFLINE_MAX_PAGES),
            pageParams: data.pageParams.slice(0, OFFLINE_MAX_PAGES),
          },
        },
      };
    }
    let size: number;
    try {
      size = JSON.stringify(compact).length;
    } catch {
      continue;
    } // Non-serializable cache entries cannot be restored offline.
    if (size > OFFLINE_MAX_QUERY_CHARS || chars + size > OFFLINE_MAX_CACHE_CHARS) continue;
    chars += size;
    queries.push(compact);
  }
  return { ...client, clientState: { ...client.clientState, queries } };
}
