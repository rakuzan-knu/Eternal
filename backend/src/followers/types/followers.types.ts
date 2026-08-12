import type { FollowStatus, Prisma } from '@prisma/client';
import type { publicUserSelect } from '../../users/users.select';
import type { Paginated } from '../../common/pagination';

export type PublicUserEntity = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export type PublicUserSummary = {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FollowUserRow = {
  id: string;
  user: PublicUserSummary | PublicUserEntity;
};

export type GetFollowersResult = Paginated<PublicUserSummary>;

export type FollowActionResult = {
  status: FollowStatus;
};

export type FollowRequestRow = {
  id: string;
  user: PublicUserSummary | PublicUserEntity;
};

export type GetFollowRequestsResult = Paginated<PublicUserSummary>;
