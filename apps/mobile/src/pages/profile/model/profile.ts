import axios from 'axios';
import type { UserProfileDto } from '@social-network/shared-contracts';
import { formatDate, formatNumber, getLanguage, tr } from '@/shared/lib/i18n';

export type ProfileTab = 'posts' | 'reposts' | 'reels' | 'saved';
export type FollowState = 'none' | 'pending' | 'following';

export function profileTabs(isOwn: boolean): { id: ProfileTab; label: string }[] {
  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'posts', label: tr('Posts') },
    { id: 'reposts', label: tr('Reposts') },
    { id: 'reels', label: tr('Reels') },
  ];
  return isOwn ? [...tabs, { id: 'saved', label: tr('Saved') }] : tabs;
}

export function followState(profile: Pick<UserProfileDto, 'followStatus' | 'isFollowing'>) {
  if (profile.followStatus === 'following' || profile.isFollowing) return 'following';
  if (profile.followStatus === 'pending') return 'pending';
  return 'none';
}

export function isContentLocked(
  profile: Pick<UserProfileDto, 'isPrivate' | 'followStatus' | 'isFollowing'>,
  isOwn: boolean,
) {
  return profile.isPrivate && !isOwn && followState(profile) !== 'following';
}

export function applyFollow(profile: UserProfileDto, next: FollowState): UserProfileDto {
  const previous = followState(profile);
  const delta =
    previous === 'following' && next !== 'following'
      ? -1
      : previous !== 'following' && next === 'following'
        ? 1
        : 0;
  return {
    ...profile,
    followStatus: next,
    isFollowing: next === 'following',
    followersCount: Math.max(0, (profile.followersCount ?? 0) + delta),
  };
}

export function isNotFound(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export function compactCount(value: number | undefined) {
  const count = value ?? 0;
  if (count < 1000) return String(count);
  const uk = getLanguage() === 'uk';
  const units: [number, string][] = [
    [1_000_000_000, uk ? ' млрд' : 'B'],
    [1_000_000, uk ? ' млн' : 'M'],
    [1_000, uk ? ' тис.' : 'K'],
  ];
  const [size, suffix] = units.find(([unit]) => count >= unit) ?? [1, ''];
  const scaled = count / size;
  return `${formatNumber(scaled >= 100 ? Math.floor(scaled) : Math.floor(scaled * 10) / 10)}${suffix}`;
}

export function joinedLabel(createdAt: string | Date | undefined) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return tr('Joined {date}', { date: formatDate(date, { month: 'long', year: 'numeric' }) });
}
