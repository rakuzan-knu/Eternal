import { FeedPage, postsApi } from '../api/postsApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { useBoundedPostFeed } from './useBoundedPostFeed';

/** Server State: main feed (60s freshness, structural sharing by default). */
export function usePostsFeed() {
  return useBoundedPostFeed<FeedPage>({
    queryKey: queryKeys.feed.list(),
    fetchPage: (cursor, signal) => postsApi.getFeed(cursor, 10, signal),
    getCount: (page) => page.posts.length,
    getNextCursor: (page) => page.nextCursor,
  });
}
