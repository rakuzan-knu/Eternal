import { apiClient as api } from '@/shared/api/httpClient';
import type { FollowRequestUser } from '../model/privacyTypes';

interface Paginated<T> {
  data: T[];
  meta: { nextCursor: string | null; hasNextPage: boolean };
}

interface FollowRequestRow {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  createdAt: string;
}

const toUser = (row: FollowRequestRow): FollowRequestUser => ({
  id: row.id,
  username: row.username,
  displayName: row.displayName,
  avatar: row.avatar,
  createdAt: row.createdAt,
});

export const followRequestsApi = {
  list: (after?: string) =>
    api
      .get<Paginated<FollowRequestRow>>('/users/me/follow-requests', { params: { after } })
      .then((r) => ({ data: r.data.data.map(toUser), meta: r.data.meta })),

  count: () =>
    api.get<{ count: number }>('/users/me/follow-requests/count').then((r) => r.data.count),

  accept: (followerId: string) =>
    api.post(`/users/me/follow-requests/${followerId}/accept`).then((r) => r.data),

  reject: (followerId: string) =>
    api.post(`/users/me/follow-requests/${followerId}/reject`).then((r) => r.data),
};
