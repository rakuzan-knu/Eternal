import type { UserProfileDto } from '@social-network/shared-contracts';
import { getMobileApi } from '@/shared/api/client';
import type { Page } from '../../feed/model/feed';

export type ConnectionKind = 'followers' | 'following';
export type ConnectionUser = Pick<
  UserProfileDto,
  'id' | 'username' | 'displayName' | 'avatar' | 'isPrivate' | 'isVerified'
> &
  Partial<Pick<UserProfileDto, 'isFollowing' | 'followsYou' | 'followStatus' | 'bio'>>;

const user = (id: string) => `/users/${encodeURIComponent(id)}`;

export const connectionsApi = {
  list: async (
    userId: string,
    kind: ConnectionKind,
    after: string | undefined,
    signal: AbortSignal,
  ) =>
    (
      await getMobileApi().get<Page<ConnectionUser>>(`${user(userId)}/${kind}`, {
        params: { after, limit: 30 },
        signal,
      })
    ).data,
  requests: async (after: string | undefined, signal: AbortSignal) =>
    (
      await getMobileApi().get<Page<ConnectionUser>>('/users/me/follow-requests', {
        params: { after, limit: 30 },
        signal,
      })
    ).data,
  requestCount: async (signal: AbortSignal) =>
    (await getMobileApi().get<{ count: number }>('/users/me/follow-requests/count', { signal }))
      .data.count,
  accept: async (followerId: string) => {
    await getMobileApi().post(`/users/me/follow-requests/${encodeURIComponent(followerId)}/accept`);
  },
  reject: async (followerId: string) => {
    await getMobileApi().post(`/users/me/follow-requests/${encodeURIComponent(followerId)}/reject`);
  },
  removeFollower: async (followerId: string) => {
    await getMobileApi().delete(`/users/me/followers/${encodeURIComponent(followerId)}`);
  },
};
