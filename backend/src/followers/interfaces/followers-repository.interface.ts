import type { FollowUserRow } from '../types/followers.types';

export const FOLLOWERS_REPOSITORY = Symbol('FOLLOWERS_REPOSITORY');

export interface IFollowersRepository {
  getFollowers(userId: string, limit: number, after?: string): Promise<FollowUserRow[]>;
  getFollowing(userId: string, limit: number, after?: string): Promise<FollowUserRow[]>;
  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
}
