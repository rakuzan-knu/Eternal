import type { UserProfileDto } from '../../users/dto/user-profile.dto';
import type { Paginated } from '../../common/pagination';

export type FollowUserRow = {
  id: string;
  user: UserProfileDto;
};

export type GetFollowersResult = Paginated<UserProfileDto>;
