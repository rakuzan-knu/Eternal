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
  activityStatus?: any;
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
      activityStatus: (u.activityStatus as any) ?? null,
    }));

  return { items, nextCursor };
}

export const followApi = {
  follow: (userId: string, signal?: AbortSignal) =>
    api.post(`/users/${userId}/follow`, ...(signal ? [{}, { signal }] : [])).then((r) => r.data),
  unfollow: (userId: string, signal?: AbortSignal) =>
    api.delete(`/users/${userId}/follow`, ...(signal ? [{ signal }] : [])).then((r) => r.data),
  getFollowers: (userId: string, cursor?: string, signal?: AbortSignal): Promise<FollowListPage> =>
    api
      .get<Record<string, unknown>>(`/users/${userId}/followers`, {
        params: { after: cursor, limit: 20 },
        ...(signal ? { signal } : {}),
      })
      .then((r) => normalizeFollowListPage(r.data)),
  getFollowing: (userId: string, cursor?: string, signal?: AbortSignal): Promise<FollowListPage> =>
    api
      .get<Record<string, unknown>>(`/users/${userId}/following`, {
        params: { after: cursor, limit: 20 },
        ...(signal ? { signal } : {}),
      })
      .then((r) => normalizeFollowListPage(r.data)),
  getFriends: async (signal?: AbortSignal): Promise<FollowUserSummary[]> => {
    const res = await api.get<Record<string, unknown>[]>(
      '/users/me/friends',
      ...(signal ? [{ signal }] : []),
    );
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
      activityStatus: (u.activityStatus as any) ?? null,
    }));
  },
  removeFollower: (followerId: string, signal?: AbortSignal) =>
    api
      .delete(`/users/me/followers/${followerId}`, ...(signal ? [{ signal }] : []))
      .then((r) => r.data),
  dismissSuggestedUser: (targetId: string, signal?: AbortSignal) =>
    api
      .post<{ success: boolean }>(
        `/users/suggested/${targetId}/dismiss`,
        ...(signal ? [{}, { signal }] : []),
      )
      .then((r) => r.data),
};
