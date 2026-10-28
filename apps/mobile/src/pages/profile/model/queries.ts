import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@social-network/shared-api-client';
import type { UserProfileDto } from '@social-network/shared-contracts';
import { feedApi } from '../../feed/api/feedApi';
import { feedKeys } from '../../feed/model/queries';
import { nextCursor } from '../../feed/model/feed';
import { profileApi, type ProfilePostsKind } from '../api/profileApi';
import { applyFollow, followState, isNotFound } from './profile';

export const profileKeys = {
  detail: (userId: string, username: string) =>
    ['mobile', userId, ...queryKeys.users.profile(username.toLowerCase())] as const,
  posts: (userId: string, profileId: string, kind: ProfilePostsKind) =>
    [...feedKeys.feeds(userId), 'profile', profileId, kind] as const,
};

export function useProfile(userId: string, username: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId, username),
    queryFn: ({ signal }) => profileApi.byUsername(username, signal),
    enabled: !!username,
    staleTime: 60_000,
    retry: (count, error) => !isNotFound(error) && count < 1,
  });
}

export function useProfilePosts(
  userId: string,
  profileId: string,
  kind: ProfilePostsKind,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: profileKeys.posts(userId, profileId, kind),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => profileApi.posts(profileId, kind, pageParam, signal),
    getNextPageParam: nextCursor,
    staleTime: 60_000,
    enabled: enabled && !!profileId,
  });
}

export function useFollowProfile(userId: string, username: string) {
  const client = useQueryClient();
  const key = profileKeys.detail(userId, username);
  return useMutation({
    mutationFn: async (profile: UserProfileDto) => {
      if (followState(profile) === 'none') {
        const { status } = await feedApi.follow(profile.id);
        return status === 'ACCEPTED' ? 'following' : 'pending';
      }
      await feedApi.unfollow(profile.id);
      return 'none';
    },
    onMutate: () => client.cancelQueries({ queryKey: key }),
    onSuccess: (next) =>
      client.setQueryData<UserProfileDto>(key, (current) =>
        current ? applyFollow(current, next) : current,
      ),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: feedKeys.suggestions(userId) });
      void client.invalidateQueries({ queryKey: feedKeys.feed(userId, 'home') });
    },
  });
}
