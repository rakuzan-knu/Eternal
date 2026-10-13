import { postsApi, FeedPage } from '../api/postsApi';
import { USER_REPOSTS_KEY } from '@/shared/api/queryKeys';
import { useBoundedPostFeed } from './useBoundedPostFeed';

export function useUserReposts(userId: string) {
  return useBoundedPostFeed<FeedPage>({
    queryKey: [USER_REPOSTS_KEY, userId],
    fetchPage: (cursor, signal) => postsApi.getUserReposts(userId, cursor, signal),
    getCount: (page) => page.posts.length,
    getNextCursor: (page) => page.nextCursor,
    enabled: !!userId,
  });
}
