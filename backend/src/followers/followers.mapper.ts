import type { PublicUserEntity } from './types/followers.types';
import type { UserProfileDto } from '../users/dto/user-profile.dto';

export function toUserProfileDto(
  user: PublicUserEntity,
  isFollowing: boolean = false,
): UserProfileDto {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    isFollowing,
  };
}
