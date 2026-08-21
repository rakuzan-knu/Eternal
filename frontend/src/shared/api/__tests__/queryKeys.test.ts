import { describe, it, expect } from 'vitest';
import * as queryKeys from '../queryKeys';

describe('queryKeys', () => {
  it('exports all standard query key constants', () => {
    expect(queryKeys.USER_KEY).toBe('user');
    expect(queryKeys.USER_BY_USERNAME_KEY).toBe('by-username');
    expect(queryKeys.CHECK_USERNAME_KEY).toBe('checkUsername');
    expect(queryKeys.FOLLOW_LIST_KEY).toBe('followList');
    expect(queryKeys.FEED_KEY).toBe('feed');
    expect(queryKeys.USER_POSTS_KEY).toBe('userPosts');
    expect(queryKeys.USER_REPOSTS_KEY).toBe('userReposts');
    expect(queryKeys.POLL_VOTERS_KEY).toBe('poll-voters');
    expect(queryKeys.CONVERSATIONS_KEY).toBe('conversations');
    expect(queryKeys.CONVERSATION_MESSAGES_KEY).toBe('conversation-messages');
    expect(queryKeys.BLOCKED_USERS_KEY).toBe('blocked-users');
    expect(queryKeys.SESSIONS_KEY).toBe('sessions');
    expect(queryKeys.PRIVACY_KEY).toBe('privacy');
    expect(queryKeys.PRIVACY_EXCEPTIONS_KEY).toBe('privacy-exceptions');
    expect(queryKeys.FOLLOW_REQUESTS_KEY).toBe('follow-requests');
    expect(queryKeys.SAVED_POSTS_KEY).toBe('saved-posts');
    expect(queryKeys.FRIENDS_KEY).toBe('friends');
    expect(queryKeys.COMMENTS_KEY).toBe('comments');
    expect(queryKeys.COMMENT_REPLIES_KEY).toBe('comment-replies');
  });
});
