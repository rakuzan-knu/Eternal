import type { FollowStatus } from '@prisma/client';
import type { FollowRequestRow, FollowUserRow } from '../types/followers.types';

export const FOLLOWERS_REPOSITORY = Symbol('FOLLOWERS_REPOSITORY');

export interface IFollowersRepository {
  getFollowers(userId: string, limit: number, after?: string): Promise<FollowUserRow[]>;
  getFollowing(userId: string, limit: number, after?: string): Promise<FollowUserRow[]>;
  followUser(followerId: string, followingId: string, status: FollowStatus): Promise<FollowStatus>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isTargetPrivate(followingId: string): Promise<boolean | null>;
  listPendingRequests(ownerId: string, limit: number, after?: string): Promise<FollowRequestRow[]>;
  acceptRequest(ownerId: string, followerId: string): Promise<boolean>;
  rejectRequest(ownerId: string, followerId: string): Promise<boolean>;
  pendingCount(ownerId: string): Promise<number>;
}
