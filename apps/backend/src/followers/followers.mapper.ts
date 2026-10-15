import type {
  FollowShowcaseSummary,
  PublicUserEntity,
  PublicUserSummary,
} from './types/followers.types';
import { profileFrameSchema, profileEffectSchema } from '@common/contracts';
import type { LiveActivityStatusDto, UserProfileDto } from '@common/contracts';

export function toUserProfileDto(
  user: (PublicUserEntity | PublicUserSummary) & {
    showcase?:
      | FollowShowcaseSummary
      | { activityStatus?: LiveActivityStatusDto | null | undefined }
      | null
      | undefined;
  },
  isFollowing: boolean = false,
  followsYou: boolean = false,
  activityStatus?: LiveActivityStatusDto | null,
): UserProfileDto {
  const badgeList = Array.isArray(user.badges)
    ? user.badges.map((b: { badgeId: string } | string) => (typeof b === 'string' ? b : b.badgeId))
    : [];

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    displayNameStyle: 'displayNameStyle' in user ? (user.displayNameStyle as any) : undefined,
    profileTheme: 'profileTheme' in user ? (user.profileTheme as any) : undefined,
    avatar: user.avatar,
    ...('activeDecoration' in user
      ? { activeDecoration: user.activeDecoration, activeDecorationId: user.activeDecorationId }
      : {}),
    ...('activeNameplate' in user
      ? { activeNameplate: user.activeNameplate, activeNameplateId: user.activeNameplateId }
      : {}),
    ...('activeProfileFrame' in user
      ? {
          activeProfileFrame: user.activeProfileFrame
            ? profileFrameSchema.parse(user.activeProfileFrame)
            : null,
          activeProfileFrameId: user.activeProfileFrameId,
        }
      : {}),
    ...('activeProfileEffect' in user
      ? {
          activeProfileEffect: user.activeProfileEffect
            ? profileEffectSchema.parse(user.activeProfileEffect)
            : null,
          activeProfileEffectId: user.activeProfileEffectId,
        }
      : {}),
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
    isFriend: Boolean(isFollowing && followsYou),
    activityStatus:
      activityStatus !== undefined ? activityStatus : (user.showcase?.activityStatus ?? null),
  };
}
