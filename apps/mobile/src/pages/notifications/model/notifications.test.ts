import { expect, it } from 'vitest';
import type {
  NotificationResponseDto,
  NotificationUnreadCountsDto,
} from '@social-network/shared-contracts';
import {
  notificationCursor,
  notificationTarget,
  uniqueNotifications,
  updateNotifications,
  type NotificationsData,
} from './notifications';

const counts: NotificationUnreadCountsDto = {
  total: 3,
  likes: 2,
  comments: 1,
  follows: 0,
  mentions: 0,
  reposts: 0,
  system: 0,
};
const like: NotificationResponseDto = {
  id: 'n1',
  userId: 'viewer',
  actorId: 'actor',
  actor: { id: 'actor', username: 'sofia', displayName: 'Sofia', avatar: null },
  type: 'LIKE_POST',
  postId: 'p1',
  commentId: null,
  text: null,
  extraCount: 0,
  isRead: false,
  createdAt: '2026-10-03T12:00:00Z',
  post: null,
  actionText: 'Sofia liked your post',
  deepLink: '/post/p1',
};
const comment: NotificationResponseDto = { ...like, id: 'n2', type: 'COMMENT', commentId: 'c1' };
const data: NotificationsData = {
  pages: [{ items: [like, comment], nextCursor: 'n2', hasMore: true, unreadCounts: counts }],
  pageParams: [undefined],
};

it('marks only the selected category read across cached pages without mutating the source', () => {
  const updated = updateNotifications(data, {
    kind: 'readAll',
    filter: 'likes',
    unreadCounts: { ...counts, total: 1, likes: 0 },
  });
  expect(updated?.pages[0]?.items.map((item) => item.isRead)).toEqual([true, false]);
  expect(updated?.pages[0]?.unreadCounts.likes).toBe(0);
  expect(data.pages[0]?.items[0]?.isRead).toBe(false);
});

it('replaces only the confirmed read item and keeps other notifications unread', () => {
  const updated = updateNotifications(data, { kind: 'read', item: { ...comment, isRead: true } });
  expect(updated?.pages[0]?.items.map((item) => item.isRead)).toEqual([false, true]);
});

it('removes a deleted notification from every page while retaining the others', () => {
  const page = data.pages[0];
  if (!page) throw new Error('Missing fixture');
  const repeated = { ...data, pages: [...data.pages, { ...page, items: [like] }] };
  const updated = updateNotifications(repeated, { kind: 'delete', id: 'n1', unreadCounts: counts });
  expect(updated?.pages.flatMap((page) => page.items).map((item) => item.id)).toEqual(['n2']);
});

it('deduplicates aggregated notifications and stops repeated or invalid cursors', () => {
  const page = data.pages[0];
  if (!page) throw new Error('Missing fixture');
  expect(uniqueNotifications({ ...data, pages: [page, page] }).map((item) => item.id)).toEqual([
    'n1',
    'n2',
  ]);
  expect(notificationCursor(page, [undefined])).toBe('n2');
  expect(notificationCursor(page, [undefined, 'n2'])).toBeUndefined();
  expect(notificationCursor({ ...page, hasMore: false }, [])).toBeUndefined();
});

it('opens post and comment targets natively instead of using the missing web post route', () => {
  expect(notificationTarget(like, 'alex')).toEqual({ kind: 'post', id: 'p1', commentId: null });
  expect(notificationTarget(comment, 'alex')).toEqual({ kind: 'post', id: 'p1', commentId: 'c1' });
});

it('keeps system notifications with no target on the page and routes verified status to self', () => {
  expect(
    notificationTarget(
      {
        ...like,
        type: 'SYSTEM',
        actor: null,
        actorId: null,
        postId: null,
        deepLink: 'https://attacker.example',
      },
      'alex',
    ),
  ).toEqual({ kind: 'none' });
  expect(notificationTarget({ ...like, type: 'SYSTEM_VERIFIED', postId: null }, 'alex')).toEqual({
    kind: 'web',
    path: '/alex',
  });
});

it('uses local story links and rejects external or executable targets', () => {
  const story = { ...like, story: { id: 's1' }, deepLink: '/profile/mia?story=s1' };
  expect(notificationTarget(story, 'alex')).toEqual({ kind: 'web', path: '/profile/mia?story=s1' });
  expect(notificationTarget({ ...story, deepLink: 'javascript:alert(1)' }, 'alex')).toEqual({
    kind: 'web',
    path: '/profile/sofia?story=s1',
  });
});
