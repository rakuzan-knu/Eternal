import { postsApi, FeedPage } from '../api/postsApi';
import { SAVED_POSTS_KEY } from '@/shared/api/queryKeys';
import { useBoundedPostFeed } from './useBoundedPostFeed';

interface SavedPostsCollection {
  id: string;
  postIds: readonly string[];
}

export function useSavedPosts(collection?: SavedPostsCollection) {
  const includedIds = collection && new Set(collection.postIds);
  return useBoundedPostFeed<FeedPage>({
    queryKey: collection
      ? [SAVED_POSTS_KEY, 'collection', collection.id, collection.postIds]
      : [SAVED_POSTS_KEY],
    fetchPage: async (cursor, signal) => {
      if (!includedIds) return postsApi.getSavedPosts(cursor, 10, signal);
      if (includedIds.size === 0) return { posts: [], nextCursor: null };
      // Skip unmatched REST pages without putting their payloads or geometry in
      // the collection window. All posts retains its own bounded cache and anchor.
      for (;;) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const page = await postsApi.getSavedPosts(cursor, 10, signal);
        const posts = page.posts.filter((post) => includedIds.has(String(post.id)));
        if (posts.length > 0 || page.nextCursor === null) {
          return { posts, nextCursor: posts.length === includedIds.size ? null : page.nextCursor };
        }
        if (page.nextCursor === cursor) throw new Error('Saved posts cursor did not advance');
        cursor = page.nextCursor;
      }
    },
    getCount: (page) => page.posts.length,
    getNextCursor: (page) => page.nextCursor,
  });
}
