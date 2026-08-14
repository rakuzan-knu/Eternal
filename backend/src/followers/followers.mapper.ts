import type { PublicUserEntity, PublicUserSummary } from './types/followers.types';
import type { UserProfileDto } from '../users/dto/user-profile.dto';

export function toUserProfileDto(
  user: PublicUserEntity | PublicUserSummary,
  isFollowing: boolean = false,
  followsYou: boolean = false,
): UserProfileDto {
  const badgeList = Array.isArray(user.badges)
    ? user.badges.map((b: { badgeId: string } | string) => (typeof b === 'string' ? b : b.badgeId))
    : [];

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    bio: user.bio,
    isPrivate: user.isPrivate,
    isVerified: user.isVerified ?? false,
    primaryBadge: user.primaryBadge ?? null,
    badges: badgeList,
    githubUsername: user.githubUsername ?? null,
    mergedPrsCount: user.mergedPrsCount ?? 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isFollowing,
    followsYou,
  };
}
