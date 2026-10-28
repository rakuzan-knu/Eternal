import { AxiosError, AxiosHeaders } from 'axios';
import { expect, it } from 'vitest';
import type { UserProfileDto } from '@social-network/shared-contracts';
import {
  applyFollow,
  compactCount,
  followState,
  isContentLocked,
  isNotFound,
  joinedLabel,
  profileTabs,
} from './profile';

const profile = {
  id: 'u1',
  username: 'mia',
  displayName: 'Mia',
  avatar: null,
  isPrivate: false,
  isVerified: false,
  followersCount: 10,
  followStatus: 'none',
  createdAt: new Date('2024-03-04T00:00:00Z'),
  updatedAt: new Date('2024-03-04T00:00:00Z'),
} as UserProfileDto;

it('shows the Saved tab only on your own profile', () => {
  expect(profileTabs(false).map((tab) => tab.id)).toEqual(['posts', 'reposts', 'reels']);
  expect(profileTabs(true).map((tab) => tab.id)).toContain('saved');
});

it('derives follow state from status and legacy flag', () => {
  expect(followState(profile)).toBe('none');
  expect(followState({ ...profile, followStatus: 'pending' })).toBe('pending');
  expect(followState({ ...profile, followStatus: undefined, isFollowing: true })).toBe('following');
});

it('locks private profiles until the viewer follows them', () => {
  const locked = { ...profile, isPrivate: true };
  expect(isContentLocked(locked, false)).toBe(true);
  expect(isContentLocked(locked, true)).toBe(false);
  expect(isContentLocked({ ...locked, followStatus: 'following' }, false)).toBe(false);
});

it('adjusts follower counts only when following changes', () => {
  expect(applyFollow(profile, 'following').followersCount).toBe(11);
  expect(applyFollow(profile, 'pending').followersCount).toBe(10);
  const following = applyFollow(profile, 'following');
  expect(applyFollow(following, 'none')).toMatchObject({ followersCount: 10, isFollowing: false });
  expect(
    applyFollow({ ...profile, followersCount: 0, isFollowing: true }, 'none').followersCount,
  ).toBe(0);
});

it('formats counts compactly without rounding up', () => {
  expect(compactCount(undefined)).toBe('0');
  expect(compactCount(999)).toBe('999');
  expect(compactCount(1_250)).toBe('1.2K');
  expect(compactCount(125_900)).toBe('125K');
  expect(compactCount(3_400_000)).toBe('3.4M');
});

it('labels join dates and ignores invalid values', () => {
  expect(joinedLabel(new Date('2024-03-14T12:00:00Z'))).toBe('Joined March 2024');
  expect(joinedLabel('not a date')).toBeNull();
  expect(joinedLabel(undefined)).toBeNull();
});

it('recognizes missing accounts', () => {
  const headers = new AxiosHeaders();
  const error = new AxiosError('Not found', '404', undefined, undefined, {
    status: 404,
    statusText: 'Not Found',
    headers,
    config: { headers },
    data: null,
  });
  expect(isNotFound(error)).toBe(true);
  expect(isNotFound(new Error('offline'))).toBe(false);
});
