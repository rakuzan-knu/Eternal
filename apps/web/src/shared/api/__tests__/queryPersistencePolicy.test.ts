import { describe, expect, it } from 'vitest';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import {
  boundPersistedClient,
  OFFLINE_MAX_QUERIES,
  OFFLINE_MAX_PAGES,
  OFFLINE_MAX_QUERY_CHARS,
} from '../queryPersistencePolicy';

function snapshot(client: QueryClient) {
  return { timestamp: 1, buster: 'test', clientState: dehydrate(client) };
}
describe('bounded offline snapshots', () => {
  it('never persists bearer invitations or recipient searches', () => {
    const client = new QueryClient();
    client.setQueryData(['community-invite-preview', 'secret-token'], {
      community: 'public-summary',
    });
    client.setQueryData(['community-invite-people-search', 'someone'], [{ id: 'user' }]);
    client.setQueryData(['communities', 'directory', ''], { data: [] });
    const bounded = boundPersistedClient(snapshot(client));
    expect(bounded.clientState.queries.map((query) => query.queryKey)).toEqual([
      ['communities', 'directory', ''],
    ]);
    client.clear();
  });
  it('keeps the most recent queries, excluding ephemeral search results', () => {
    const client = new QueryClient();
    for (let i = 0; i < 100; i++)
      client.setQueryData(['user', i], { name: `User ${i}` }, { updatedAt: i + 1 });
    client.setQueryData(['user-search', 'query'], Array(1000).fill({ name: 'Match' }));
    const bounded = boundPersistedClient(snapshot(client));
    expect(bounded.clientState.queries).toHaveLength(OFFLINE_MAX_QUERIES);
    expect(bounded.clientState.queries[0].queryKey).toEqual(['user', 99]);
    expect(bounded.clientState.queries.some((q) => q.queryKey[0] === 'user-search')).toBe(false);
    client.clear();
  });
  it('keeps matching pages/cursors while leaving the active history untouched', () => {
    const client = new QueryClient();
    const history = {
      pages: Array.from({ length: 50 }, (_, i) => ({
        data: [i],
        nextCursor: String(i),
        hasMore: true,
      })),
      pageParams: Array.from({ length: 50 }, (_, i) => String(i)),
    };
    client.setQueryData(['conversation-messages', 'c1'], history);
    const bounded = boundPersistedClient(snapshot(client));
    const data = bounded.clientState.queries[0].state.data as typeof history;
    expect(data.pages).toHaveLength(OFFLINE_MAX_PAGES);
    expect(data.pageParams).toEqual(history.pageParams.slice(0, OFFLINE_MAX_PAGES));
    expect(history.pages).toHaveLength(50);
    client.clear();
  });
  it('skips oversized payloads and preserves pending offline mutations', () => {
    const client = new QueryClient();
    client.setQueryData(['user', 'inline-image'], 'x'.repeat(OFFLINE_MAX_QUERY_CHARS));
    client.setQueryData(['user', 'small'], { name: 'Small' });
    const original = snapshot(client);
    const mutation = {
      mutationKey: ['send'],
      state: { isPaused: true },
    } as unknown as (typeof original.clientState.mutations)[number];
    original.clientState.mutations.push(mutation);
    const bounded = boundPersistedClient(original);
    expect(bounded.clientState.queries.map((q) => q.queryKey)).toEqual([['user', 'small']]);
    expect(bounded.clientState.mutations).toEqual([mutation]);
    client.clear();
  });
});
