import type { PostResponseDto, UserProfileDto } from '@social-network/shared-contracts';
import { getMobileApi } from '@/shared/api/client';
import type { Page } from '../../feed/model/feed';

export type ProfilePostsKind = 'posts' | 'reposts';

const userPath = (id: string) => `/users/${encodeURIComponent(id)}`;

export const profileApi = {
  byUsername: async (username: string, signal: AbortSignal) =>
    (
      await getMobileApi().get<UserProfileDto>(
        `/users/by-username/${encodeURIComponent(username)}`,
        { signal },
      )
    ).data,
  posts: async (
    userId: string,
    kind: ProfilePostsKind,
    after: string | undefined,
    signal: AbortSignal,
  ) =>
    (
      await getMobileApi().get<Page<PostResponseDto>>(`${userPath(userId)}/${kind}`, {
        params: { after, limit: 10 },
        signal,
      })
    ).data,
};
