export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatar?: string | null;
  banner?: string | null;
  bannerPosition?: number;
  identity: string;
  birthDate?: string;
  gender: 'Male' | 'Female' | 'Custom' | string;
  createdAt: string;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
}
