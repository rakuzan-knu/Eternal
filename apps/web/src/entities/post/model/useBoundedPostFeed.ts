import { useEffect } from 'react';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
  type QueryClient,
} from '@tanstack/react-query';
import {
  FEED_KEY,
  USER_POSTS_KEY,
  USER_REPOSTS_KEY,
  SAVED_POSTS_KEY,
} from '@/shared/api/queryKeys';
import { queryStaleTimes, queryGcTimes } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { getPostFeedWindow, postFeedReplayOrdinal, POST_FEED_MAX_PAGES } from './postFeedWindow';
import { postFeedColdCache } from './postFeedColdCache';

interface Options<Page> {
  queryKey: QueryKey;
  fetchPage: (cursor: string | undefined, signal: AbortSignal) => Promise<Page>;
  getCount: (page: Page) => number;
  getNextCursor: (page: Page) => string | null;
  enabled?: boolean;
}
interface PostFeedPageParam {
  cursor?: string;
  ordinal: number;
  startIndex: number;
}
const FIRST_PAGE: PostFeedPageParam = { ordinal: 0, startIndex: 0 };
const observedClients = new WeakSet<QueryClient>();
const postFeedRoots = new Set<string>([
  FEED_KEY,
  USER_POSTS_KEY,
  USER_REPOSTS_KEY,
  SAVED_POSTS_KEY,
]);

export function useBoundedPostFeed<Page>({
  queryKey,
  fetchPage,
  getCount,
  getNextCursor,
  enabled = true,
}: Options<Page>) {
  const accountId = useAuthStore((state) => state.userId) ?? '';
  const client = useQueryClient();
  const feed = JSON.stringify(queryKey);
  const window = getPostFeedWindow(accountId, queryKey);
  const scope = { accountId, feed };
  const resolveParam = (param: PostFeedPageParam | string | undefined): PostFeedPageParam =>
    param && typeof param === 'object'
      ? param
      : {
          cursor: param,
          ordinal: Math.max(0, window.locate(param)),
          startIndex: window.start(param),
        };
  const fetchedLocations = new WeakMap<object, PostFeedPageParam>();
  const resolvePageParam = (page: Page, param: PostFeedPageParam): PostFeedPageParam =>
    (typeof page === 'object' && page !== null ? fetchedLocations.get(page) : undefined) ??
    resolveParam(param);
  const replayLocations: Array<PostFeedPageParam & { count: number; nextCursor: string | null }> =
    [];
  const query = useInfiniteQuery<
    Page,
    Error,
    InfiniteData<Page, PostFeedPageParam>,
    QueryKey,
    PostFeedPageParam
  >({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const request = { ...resolveParam(pageParam) };
      const cursor = request.cursor;
      const token = postFeedColdCache.token();
      // Refetches must hit REST. Only movement into a known, evicted page may use disk.
      const moving = client.getQueryCache().find({ queryKey, exact: true })?.state
        .fetchMeta?.fetchMore;
      const cached =
        moving && window.locate(cursor) >= 0
          ? await postFeedColdCache.read<Page>(scope, cursor, token)
          : undefined;
      let page: Page;
      if (
        !cached &&
        ((moving?.direction === 'backward' && window.revision !== token.generation) ||
          postFeedReplayOrdinal(cursor) !== undefined ||
          (cursor !== undefined && window.locate(cursor) < 0))
      ) {
        // The small cursor index may expire/evict. Replay REST one page at a time,
        // retaining no intermediate payloads, so even that boundary is reversible.
        const targetOrdinal =
          moving?.direction === 'backward' && window.revision !== token.generation
            ? request.ordinal
            : postFeedReplayOrdinal(cursor);
        let replayCursor: string | undefined;
        let ordinal = 0;
        let startIndex = 0;
        for (;;) {
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          page = await fetchPage(replayCursor, signal);
          replayLocations.push({
            cursor: replayCursor,
            ordinal,
            startIndex,
            count: getCount(page),
            nextCursor: getNextCursor(page),
          });
          if (replayLocations.length > 256) replayLocations.shift();
          await postFeedColdCache.write(scope, replayCursor, page, token);
          if (targetOrdinal === ordinal || (targetOrdinal === undefined && replayCursor === cursor))
            break;
          const next = getNextCursor(page);
          if (next === null || next === replayCursor) break;
          startIndex += getCount(page);
          ordinal++;
          replayCursor = next;
        }
        request.startIndex = startIndex;
        request.ordinal = ordinal;
        request.cursor = replayCursor;
      } else page = cached ?? (await fetchPage(cursor, signal));
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (typeof page === 'object' && page !== null) fetchedLocations.set(page, request);
      if (!cached) await postFeedColdCache.write(scope, request.cursor, page, token);
      return page;
    },
    // TanStack's infinite persister surrounds the aggregate fetch, so a restored
    // predecessor and its rebased neighbors become visible in one cache commit.
    persister: async (fetch, context) => {
      const token = postFeedColdCache.token();
      const moving = client.getQueryCache().find({ queryKey, exact: true })?.state
        .fetchMeta?.fetchMore;
      // The infinite fetch constructs each page context internally. The public
      // persister signature still describes a single page fetch.
      const fetched: unknown = await fetch({
        ...context,
        pageParam: FIRST_PAGE,
        direction: moving?.direction ?? 'forward',
      });
      if (
        !fetched ||
        typeof fetched !== 'object' ||
        !('pages' in fetched) ||
        !('pageParams' in fetched) ||
        !Array.isArray(fetched.pages) ||
        !Array.isArray(fetched.pageParams) ||
        fetched.pages.length !== fetched.pageParams.length
      ) {
        throw new Error('Invalid infinite feed result');
      }
      const pages: Page[] = fetched.pages;
      const pageParams: PostFeedPageParam[] = fetched.pageParams.map((param: unknown) => {
        if (
          !param ||
          typeof param !== 'object' ||
          !('ordinal' in param) ||
          !('startIndex' in param) ||
          !Number.isSafeInteger(param.ordinal) ||
          Number(param.ordinal) < 0 ||
          !Number.isSafeInteger(param.startIndex) ||
          Number(param.startIndex) < 0 ||
          ('cursor' in param && param.cursor !== undefined && typeof param.cursor !== 'string')
        )
          throw new Error('Invalid feed page location');
        return {
          ordinal: Number(param.ordinal),
          startIndex: Number(param.startIndex),
          cursor: 'cursor' in param ? (param.cursor as string | undefined) : undefined,
        };
      });
      let data = {
        pages,
        pageParams: pages.map((page, index) => resolvePageParam(page, pageParams[index])),
      };
      const changedBoundary =
        data.pages.length > 1 && getNextCursor(data.pages[0]) !== data.pageParams[1].cursor;
      const rebase =
        moving?.direction === 'backward' &&
        (window.revision !== token.generation || changedBoundary);
      if (rebase) {
        const retainedPages = Math.min(POST_FEED_MAX_PAGES, data.pages.length);
        data = { pages: [data.pages[0]], pageParams: [data.pageParams[0]] };
        for (let index = 1; index < retainedPages; index++) {
          const previous = data.pages.at(-1)!;
          const previousParam = data.pageParams.at(-1)!;
          const cursor = getNextCursor(previous);
          if (cursor === null) break;
          if (context.signal.aborted) throw new DOMException('Aborted', 'AbortError');
          const page = await fetchPage(cursor, context.signal);
          const param = {
            cursor,
            ordinal: previousParam.ordinal + 1,
            startIndex: previousParam.startIndex + getCount(previous),
          };
          data.pages.push(page);
          data.pageParams.push(param);
          await postFeedColdCache.write(scope, cursor, page, token);
        }
      }
      if (context.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (!postFeedColdCache.isCurrent(token))
        throw new Error('Feed changed while restoring its window');
      if (rebase || (!moving && data.pageParams[0]?.ordinal === 0)) {
        window.beginRevision(token.generation);
      }
      for (const location of replayLocations)
        window.remember(location.cursor, location.count, location.nextCursor, location);
      data.pages.forEach((page, index) => {
        const param = data.pageParams[index];
        window.remember(param.cursor, getCount(page), getNextCursor(page), param);
      });
      return data as unknown as Page;
    },
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page, _pages, param) => {
      const cursor = getNextCursor(page);
      const request = resolvePageParam(page, param);
      return cursor === null
        ? undefined
        : {
            cursor,
            ordinal: request.ordinal + 1,
            startIndex: request.startIndex + getCount(page),
          };
    },
    // The page param carries its ordinal through route return and offline hydration.
    getPreviousPageParam: (_page, _pages, param) => {
      const request = resolveParam(param);
      if (request.ordinal === 0) return;
      const cursor = window.previous(request.cursor) ?? `__post_feed_replay_${request.ordinal - 1}`;
      return { cursor, ordinal: request.ordinal - 1, startIndex: window.start(cursor) };
    },
    maxPages: POST_FEED_MAX_PAGES,
    enabled,
    staleTime: queryStaleTimes.feed,
    gcTime: queryGcTimes.default,
  });
  query.data?.pages.forEach((page, index) => {
    const request = resolveParam(query.data!.pageParams[index]);
    window.remember(request.cursor, getCount(page), getNextCursor(page), request);
  });
  useEffect(() => {
    if (observedClients.has(client)) return;
    observedClients.add(client);
    // Keep the cache boundary for this QueryClient's lifetime. Realtime updates
    // may patch an inactive profile after its screen has unmounted.
    client.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        postFeedRoots.has(String(event.query.queryKey[0])) &&
        (event.action.type === 'invalidate' ||
          (event.action.type === 'success' && event.action.manual))
      ) {
        void postFeedColdCache.invalidate(useAuthStore.getState().userId ?? undefined);
      }
    });
  }, [client]);
  return {
    ...query,
    window,
    startIndex: query.data ? window.start(resolveParam(query.data.pageParams[0]).cursor) : 0,
    knownItemCount: window.count,
  };
}
