import type {
  UserProfileDto,
  AutoDeletePeriod as BackendAutoDeletePeriod,
  FollowStatusView as BackendFollowStatusView,
  LastSeenGranularity as BackendLastSeenGranularity,
} from '@backend/common/contracts';

export type AutoDeletePeriod =
  BackendAutoDeletePeriod | 'OFF' | 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER';
export type FollowStatusView = BackendFollowStatusView | 'none' | 'pending' | 'following';
export type LastSeenGranularity =
  BackendLastSeenGranularity | 'RECENTLY' | 'WITHIN_WEEK' | 'WITHIN_MONTH' | 'LONG_AGO';

export interface UserProfile extends Omit<
  Partial<UserProfileDto>,
  | 'createdAt'
  | 'updatedAt'
  | 'birthDate'
  | 'followStatus'
  | 'autoDeletePeriod'
  | 'lastSeen'
  | 'lastSeenAt'
> {
  id: string;
  username: string;
  displayName?: string;
  bio?: string | null;
  avatar?: string | null;
  banner?: string | null;
  bannerPosition?: number;
  identity?: string;
  birthDate?: string | null;
  gender?: 'Male' | 'Female' | 'Custom' | string;
  createdAt: string;
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  followsYou?: boolean;
  followersCount?: number;
  followingCount?: number;
  isPrivate?: boolean;
  isVerified?: boolean;
  primaryBadge?: string | null;
  badges?: string[];
  subscriptionMonths?: number;
  subscriptionDate?: string;
  prCount?: number;
  reportCount?: number;
  githubUsername?: string | null;
  mergedPrsCount?: number;
  followStatus?: FollowStatusView;
  lastSeen?: string | LastSeenGranularity | null;
  autoDeletePeriod?: AutoDeletePeriod;
}
