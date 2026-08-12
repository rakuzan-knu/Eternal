export type AutoDeletePeriod = 'OFF' | 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER';

export type FollowStatusView = 'none' | 'pending' | 'following';

export type LastSeenGranularity = 'RECENTLY' | 'WITHIN_WEEK' | 'WITHIN_MONTH' | 'LONG_AGO';

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string | null;
  avatar?: string | null;
  banner?: string | null;
  bannerPosition?: number;
  identity: string;
  birthDate?: string | null;
  gender: 'Male' | 'Female' | 'Custom' | string;
  createdAt: string;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
  isPrivate?: boolean;
  followStatus?: FollowStatusView;
  lastSeen?: string | LastSeenGranularity | null;
  autoDeletePeriod?: AutoDeletePeriod;
}
