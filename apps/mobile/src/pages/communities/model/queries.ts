import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateCommunityDto,
  CreateCommunityInviteDto,
} from '@social-network/shared-contracts';
import { communitiesApi } from '../api/communitiesApi';

export const communityKeys = {
  all: (userId: string) => ['mobile', userId, 'communities'] as const,
  directory: (userId: string, q: string) => [...communityKeys.all(userId), 'directory', q] as const,
  mine: (userId: string) => [...communityKeys.all(userId), 'mine'] as const,
  detail: (userId: string, id: string) => [...communityKeys.all(userId), id] as const,
  channels: (userId: string, id: string) =>
    [...communityKeys.detail(userId, id), 'channels'] as const,
  members: (userId: string, id: string) =>
    [...communityKeys.detail(userId, id), 'members'] as const,
};

const nextCommunityCursor = (page: { nextCursor: string | null }) => page.nextCursor ?? undefined;

export function useCommunityDirectory(userId: string, q: string) {
  return useInfiniteQuery({
    queryKey: communityKeys.directory(userId, q),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => communitiesApi.directory(q, pageParam, signal),
    getNextPageParam: nextCommunityCursor,
    staleTime: 60_000,
  });
}

export function useMyCommunities(userId: string) {
  return useQuery({
    queryKey: communityKeys.mine(userId),
    queryFn: ({ signal }) => communitiesApi.mine(signal),
    staleTime: 30_000,
  });
}

export function useCommunity(userId: string, id: string) {
  return useQuery({
    queryKey: communityKeys.detail(userId, id),
    queryFn: ({ signal }) => communitiesApi.detail(id, signal),
    enabled: !!id,
  });
}

export function useCommunityChannels(userId: string, id: string) {
  return useQuery({
    queryKey: communityKeys.channels(userId, id),
    queryFn: ({ signal }) => communitiesApi.channels(id, signal),
    enabled: !!id,
    staleTime: 0,
    retry: false,
  });
}

export function useCommunityMembers(userId: string, id: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: communityKeys.members(userId, id),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => communitiesApi.members(id, pageParam, signal),
    getNextPageParam: nextCommunityCursor,
    enabled: enabled && !!id,
  });
}

function useInvalidateCommunities(userId: string) {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: communityKeys.all(userId) });
}

export function useCreateCommunity(userId: string) {
  const invalidate = useInvalidateCommunities(userId);
  return useMutation({
    mutationFn: (input: CreateCommunityDto) => communitiesApi.create(input),
    onSuccess: () => invalidate(),
  });
}

export function useCreateInvite(communityId: string) {
  return useMutation({
    mutationFn: (input: CreateCommunityInviteDto) => communitiesApi.invite(communityId, input),
  });
}

export function useJoinCommunity(userId: string, token: string) {
  const invalidate = useInvalidateCommunities(userId);
  return useMutation({
    mutationFn: () => communitiesApi.join(token),
    onSuccess: () => invalidate(),
  });
}

export function useLeaveCommunity(userId: string, communityId: string) {
  const invalidate = useInvalidateCommunities(userId);
  return useMutation({
    mutationFn: () => communitiesApi.leave(communityId),
    onSuccess: () => invalidate(),
  });
}

export function useInvitePreview(token: string, instance: string) {
  return useQuery({
    queryKey: ['mobile', 'community-invite-preview', instance],
    queryFn: ({ signal }) => communitiesApi.preview(token, signal),
    enabled: !!token,
    gcTime: 0,
    retry: false,
  });
}
