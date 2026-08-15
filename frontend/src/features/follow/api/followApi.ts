import { apiClient as api } from '@/shared/api/httpClient';
import type {
  RecommendationMutualFriendDto,
  RecommendationReasonDto,
  UserProfileDto,
} from '@backend/common/contracts';

export type RecommendationMutualFriend = RecommendationMutualFriendDto;
export type RecommendationReason = RecommendationReasonDto;

export type FollowUserSummary = Omit<Partial<UserProfileDto>, 'recommendationReason'> & {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  isFollowing: boolean;
  followsYou?: boolean;
  isFriend?: boolean;
  isVerified?: boolean;
  primaryBadge?: string | null;
  recommendationReason?: RecommendationReason | null;
};

export interface FollowListPage {
  items: FollowUserSummary[];
  nextCursor?: string | null;
}

export function normalizeFollowListPage(
  resData: Record<string, unknown> | null | undefined,
): FollowListPage {
  if (!resData) return { items: [], nextCursor: null };

  const rawList = Array.isArray(resData.data)
    ? resData.data
    : Array.isArray(resData.items)
      ? resData.items
      : Array.isArray(resData)
        ? resData
        : [];

  const meta = resData.meta as { nextCursor?: string | null } | undefined;
  const nextCursor = meta?.nextCursor ?? (resData.nextCursor as string | null | undefined) ?? null;

  const items: FollowUserSummary[] = (rawList as Record<string, unknown>[])
    .filter(Boolean)
    .map((u) => ({
      id: (u.id as string) ?? '',
      username: (u.username as string) ?? 'user',
      displayName:
        (u.displayName as string | null | undefined) ??
        (u.username as string | undefined) ??
        'User',
      avatar: (u.avatar as string | null | undefined) ?? null,
      isFollowing: Boolean(u.isFollowing),
      followsYou: Boolean(u.followsYou),
      isVerified: Boolean(u.isVerified),
      primaryBadge: (u.primaryBadge as string | null | undefined) ?? null,
    }));

  return { items, nextCursor };
}

export const followApi = {
  follow: (userId: string) => api.post(`/users/${userId}/follow`).then((r) => r.data),
  unfollow: (userId: string) => api.delete(`/users/${userId}/follow`).then((r) => r.data),
  getFollowers: (userId: string, cursor?: string): Promise<FollowListPage> =>
    api
      .get<Record<string, unknown>>(`/users/${userId}/followers`, {
        params: { after: cursor, limit: 20 },
      })
      .then((r) => normalizeFollowListPage(r.data)),
  getFollowing: (userId: string, cursor?: string): Promise<FollowListPage> =>
    api
      .get<Record<string, unknown>>(`/users/${userId}/following`, {
        params: { after: cursor, limit: 20 },
      })
      .then((r) => normalizeFollowListPage(r.data)),
  getFriends: async (): Promise<FollowUserSummary[]> => {
    const res = await api.get<Record<string, unknown>[]>('/users/me/friends');
    const list = Array.isArray(res.data) ? res.data : [];
    return list.map((u) => ({
      id: (u.id as string) ?? '',
      username: (u.username as string) ?? 'user',
      displayName:
        (u.displayName as string | null | undefined) ??
        (u.username as string | undefined) ??
        'User',
      avatar: (u.avatar as string | null | undefined) ?? null,
      isFollowing: true,
      followsYou: true,
      isFriend: true,
      isVerified: Boolean(u.isVerified),
      primaryBadge: (u.primaryBadge as string | null | undefined) ?? null,
    }));
  },
  removeFollower: (followerId: string) =>
    api.delete(`/users/me/followers/${followerId}`).then((r) => r.data),
  dismissSuggestedUser: (targetId: string) =>
    api.post<{ success: boolean }>(`/users/suggested/${targetId}/dismiss`).then((r) => r.data),
};
