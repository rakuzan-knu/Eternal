import type { Prisma } from '@prisma/client';
import type { publicUserSelect } from '../../users/users.select';
import type { UserProfileDto } from '../../users/dto/user-profile.dto';
import type { Paginated } from '../../common/pagination';

export type PublicUserEntity = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export type FollowUserRow = {
  id: string;
  user: PublicUserEntity;
};

export type GetFollowersResult = Paginated<UserProfileDto>;
