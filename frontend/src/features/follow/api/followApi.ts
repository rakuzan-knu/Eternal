import { apiClient as api } from '@/shared/api/httpClient';

export interface FollowUserSummary {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  isFollowing: boolean;
}
export interface FollowListPage {
  items: FollowUserSummary[];
  nextCursor?: string | null;
}

export const followApi = {
  follow: (userId: string) => api.post(`/users/${userId}/follow`).then((r) => r.data),
  unfollow: (userId: string) => api.delete(`/users/${userId}/follow`).then((r) => r.data),
  getFollowers: (userId: string, cursor?: string) =>
    api
      .get<FollowListPage>(`/users/${userId}/followers`, { params: { after: cursor, limit: 20 } })
      .then((r) => r.data),
  getFollowing: (userId: string, cursor?: string) =>
    api
      .get<FollowListPage>(`/users/${userId}/following`, { params: { after: cursor, limit: 20 } })
      .then((r) => r.data),
  removeFollower: (followerId: string) =>
    api.delete(`/users/me/followers/${followerId}`).then((r) => r.data),
};
