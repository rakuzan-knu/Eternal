import { describe, it, expect } from 'vitest';
import {
  queryKeys,
  USER_KEY,
  CONVERSATIONS_KEY,
  CONVERSATION_MESSAGES_KEY,
  NOTIFICATIONS_KEY,
  FEED_KEY,
} from '../queryKeys';

describe('queryKeys factory', () => {
  it('keeps legacy constants as factory roots (cache-compatible)', () => {
    expect(queryKeys.user.root).toEqual([USER_KEY]);
    expect(queryKeys.conversations.root).toEqual([CONVERSATIONS_KEY]);
    expect(queryKeys.feed.root).toEqual([FEED_KEY]);
    expect(queryKeys.notifications.root).toEqual([NOTIFICATIONS_KEY]);
  });

  it('builds scoped message keys without literals', () => {
    expect(queryKeys.conversations.messages('conv-1')).toEqual([
      CONVERSATION_MESSAGES_KEY,
      'conv-1',
    ]);
    expect(queryKeys.conversations.detail('conv-1')).toEqual([CONVERSATIONS_KEY, 'conv-1']);
    expect(queryKeys.conversations.detailAlias('conv-1')).toEqual(['conversation', 'conv-1']);
  });

  it('builds per-domain keys deterministically', () => {
    expect(queryKeys.user.current('u1')).toEqual([USER_KEY, 'u1']);
    expect(queryKeys.user.byUsername('alice')).toEqual([USER_KEY, 'by-username', 'alice']);
    expect(queryKeys.notifications.list('likes')).toEqual([NOTIFICATIONS_KEY, 'likes']);
    expect(queryKeys.feed.userPosts('u1')).toEqual(['userPosts', 'u1']);
    expect(queryKeys.comments.list('p1')).toEqual(['comments', 'p1']);
    expect(queryKeys.stories.user('author-1')).toEqual(['user-stories', 'author-1']);
    expect(queryKeys.reels.comments('r1')).toEqual(['reel-comments', 'r1']);
    expect(queryKeys.profile.followRequests.count).toEqual(['follow-requests', 'count']);
  });

  it('produces readonly tuples usable directly as query keys', () => {
    const key = queryKeys.conversations.messages('conv-9');
    expect(Array.isArray(key)).toBe(true);
    expect(key[0]).toBe(CONVERSATION_MESSAGES_KEY);
  });
});
