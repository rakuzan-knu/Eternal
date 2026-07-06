import { type User } from '@prisma/client';

export const FOLLOWERS_REPOSITORY = Symbol('FOLLOWERS_REPOSITORY');

export interface IFollowersRepository {
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
}
