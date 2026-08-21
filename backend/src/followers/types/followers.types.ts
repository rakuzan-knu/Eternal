import type { FollowStatus, Prisma } from '@prisma/client';
import type { publicUserSelect } from '../../users/users.select';
import type { Paginated } from '../../common/pagination';
import type { UserProfileDto } from '@common/contracts';

export type PublicUserEntity = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export type PublicUserSummary = {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio?: string | null;
  isPrivate: boolean;
  isVerified?: boolean;
  primaryBadge?: string | null;
  badges?: { badgeId: string }[] | string[];
  githubUsername?: string | null;
  mergedPrsCount?: number;
  createdAt: Date;
  updatedAt: Date;
  isFollowing?: boolean;
  followsYou?: boolean;
  isFriend?: boolean;
};

export type FollowUserRow = {
  id: string;
  user: PublicUserSummary | PublicUserEntity;
};

export type GetFollowersResult = Paginated<UserProfileDto | PublicUserSummary>;

export type FollowActionResult = {
  status: FollowStatus;
};

export type FollowRequestRow = {
  id: string;
  user: PublicUserSummary | PublicUserEntity;
};

export type GetFollowRequestsResult = Paginated<UserProfileDto | PublicUserSummary>;
