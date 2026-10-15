import { postsApi, FeedPage } from '../api/postsApi';
import { USER_POSTS_KEY } from '@/shared/api/queryKeys';
import { useBoundedPostFeed } from './useBoundedPostFeed';

export function useUserPosts(userId: string) {
  return useBoundedPostFeed<FeedPage>({
    queryKey: [USER_POSTS_KEY, userId],
    fetchPage: (cursor, signal) => postsApi.getUserPosts(userId, cursor, signal),
    getCount: (page) => page.posts.length,
    getNextCursor: (page) => page.nextCursor,
    enabled: !!userId,
  });
}
