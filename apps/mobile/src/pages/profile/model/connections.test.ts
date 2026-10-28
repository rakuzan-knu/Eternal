import { expect, it, vi } from 'vitest';
import type { ConnectionUser } from '../api/connectionsApi';

vi.mock('@/shared/api/client', () => ({ getMobileApi: () => ({}) }));
vi.mock('../../feed/api/feedApi', () => ({ feedApi: {} }));

const { patchUser, rowFollowState, uniqueUsers } = await import('./connections');

const user = (id: string, extra: Partial<ConnectionUser> = {}): ConnectionUser => ({
  id,
  username: id,
  displayName: null,
  avatar: null,
  isPrivate: false,
  isVerified: false,
  ...extra,
});

it('derives the follow button state for each row', () => {
  expect(rowFollowState(user('me'), 'me')).toBe('self');
  expect(rowFollowState(user('a'), 'me')).toBe('none');
  expect(rowFollowState(user('a', { isFollowing: true }), 'me')).toBe('following');
  expect(rowFollowState(user('a', { followStatus: 'pending' }), 'me')).toBe('pending');
});

it('dedupes users across pages and patches one user everywhere', () => {
  const data = {
    pages: [
      { data: [user('a'), user('b')], meta: { nextCursor: 'x', hasNextPage: true } },
      { data: [user('b'), user('c')], meta: { nextCursor: null, hasNextPage: false } },
    ],
    pageParams: [undefined, 'x'],
  };
  expect(uniqueUsers(data).map((u) => u.id)).toEqual(['a', 'b', 'c']);
  const patched = patchUser(data, 'b', { isFollowing: true });
  expect(patched?.pages.flatMap((p) => p.data).filter((u) => u.isFollowing)).toHaveLength(2);
});
