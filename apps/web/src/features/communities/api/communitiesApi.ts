import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/httpClient';
import { queryKeys } from '@/shared/api/queryKeys';
import {
  communitySummaryResponseSchema,
  communityChannelResponseSchema,
  communityDirectoryResponseSchema,
  communityChannelsResponseSchema,
  communityMembersResponseSchema,
  communityInvitesResponseSchema,
  createdCommunityInviteResponseSchema,
  communityInvitePreviewResponseSchema,
  communityJoinResponseSchema,
  communitySuccessResponseSchema,
  communityRevocationResponseSchema,
  communityChannelLayoutResponseSchema,
  communityChannelAccessSchema,
  type CommunityChannelAccessDto,
  type CommunityChannelLayoutDto,
  type CommunityChannelArchiveDto,
  type CreateCommunityDto,
  type CreateCommunityChannelDto,
  type CreateCommunityInviteDto,
} from '@social-network/shared-contracts';

export const communityKeys = queryKeys.communities;
const base = '/messenger/communities';
export function useCommunityDirectory(q: string, after?: string) {
  return useQuery({
    select: (data) => communityDirectoryResponseSchema.parse(data),
    queryKey: communityKeys.directory(q, after),
    queryFn: async ({ signal }) =>
      communityDirectoryResponseSchema.parse(
        (
          await apiClient.get<unknown>(base, {
            params: { q, after, limit: 12 },
            signal,
          })
        ).data,
      ),
  });
}
export function useMyCommunities(enabled: boolean, after?: string) {
  return useQuery({
    select: (data) => communityDirectoryResponseSchema.parse(data),
    queryKey: [...communityKeys.mine, after ?? 'first'],
    enabled,
    queryFn: async ({ signal }) =>
      communityDirectoryResponseSchema.parse(
        (
          await apiClient.get<unknown>(`${base}/mine`, {
            params: { limit: 50, after },
            signal,
          })
        ).data,
      ),
  });
}
export function useCommunity(id: string) {
  return useQuery({
    select: (data) => communitySummaryResponseSchema.parse(data),
    queryKey: communityKeys.detail(id),
    enabled: Boolean(id),
    queryFn: async ({ signal }) =>
      communitySummaryResponseSchema.parse(
        (await apiClient.get<unknown>(`${base}/${id}`, { signal })).data,
      ),
  });
}
export function useCommunityChannels(id: string, enabled: boolean) {
  return useQuery({
    select: (data) => communityChannelsResponseSchema.parse(data),
    queryKey: communityKeys.channels(id),
    enabled: Boolean(id) && enabled,
    // Disk snapshots can precede an acknowledged layout edit or role change.
    // Always reconcile on mount, even if persistence marks that snapshot fresh.
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
    queryFn: async ({ signal }) =>
      communityChannelsResponseSchema.parse(
        (await apiClient.get<unknown>(`${base}/${id}/channels`, { signal })).data,
      ),
  });
}
export function useCommunityMembers(id: string, enabled: boolean, after?: string, q?: string) {
  return useQuery({
    select: (data) => communityMembersResponseSchema.parse(data),
    queryKey: q ? [...communityKeys.members(id, after), q] : communityKeys.members(id, after),
    enabled,
    queryFn: async ({ signal }) =>
      communityMembersResponseSchema.parse(
        (
          await apiClient.get<unknown>(`${base}/${id}/members`, {
            params: { after, limit: 25, ...(q ? { q } : {}) },
            signal,
          })
        ).data,
      ),
  });
}
export function useCommunityInvites(id: string, enabled: boolean, after?: string) {
  return useQuery({
    select: (data) => communityInvitesResponseSchema.parse(data),
    queryKey: [...communityKeys.invites(id), after ?? 'first'],
    enabled,
    queryFn: async ({ signal }) =>
      communityInvitesResponseSchema.parse(
        (
          await apiClient.get<unknown>(`${base}/${id}/invites`, {
            params: { limit: 25, after },
            signal,
          })
        ).data,
      ),
  });
}
export function useCommunityBans(id: string, enabled: boolean, after?: string) {
  return useQuery({
    select: (data) => communityMembersResponseSchema.parse(data),
    queryKey: communityKeys.bans(id, after),
    enabled,
    queryFn: async ({ signal }) =>
      communityMembersResponseSchema.parse(
        (
          await apiClient.get<unknown>(`${base}/${id}/bans`, {
            params: { limit: 25, after },
            signal,
          })
        ).data,
      ),
  });
}
export function useCommunityAction<TInput, TOutput>(action: (input: TInput) => Promise<TOutput>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: communityKeys.root }),
        client.invalidateQueries({ queryKey: queryKeys.conversations.root }),
      ]);
    },
  });
}
export const communitiesApi = {
  channelAccess: async (id: string, channelId: string, signal?: AbortSignal) =>
    communityChannelAccessSchema.parse(
      (await apiClient.get<unknown>(`${base}/${id}/channels/${channelId}/access`, { signal })).data,
    ),
  setChannelAccess: async (id: string, channelId: string, input: CommunityChannelAccessDto) =>
    communityChannelAccessSchema.parse(
      (await apiClient.patch<unknown>(`${base}/${id}/channels/${channelId}/access`, input)).data,
    ),
  setChannelArchived: async (id: string, channelId: string, input: CommunityChannelArchiveDto) =>
    communityChannelResponseSchema.parse(
      (await apiClient.patch<unknown>(`${base}/${id}/channels/${channelId}/archive`, input)).data,
    ),
  updateChannelLayout: async (id: string, input: CommunityChannelLayoutDto) =>
    communityChannelLayoutResponseSchema.parse(
      (await apiClient.patch<unknown>(`${base}/${id}/channel-layout`, input)).data,
    ),
  create: async (input: CreateCommunityDto) =>
    communitySummaryResponseSchema.parse((await apiClient.post<unknown>(base, input)).data),
  update: async (id: string, input: CreateCommunityDto) =>
    communitySummaryResponseSchema.parse(
      (await apiClient.patch<unknown>(`${base}/${id}`, input)).data,
    ),
  createChannel: async (id: string, input: CreateCommunityChannelDto) =>
    communityChannelResponseSchema.parse(
      (await apiClient.post(`${base}/${id}/channels`, input)).data,
    ),
  invite: async (id: string, input: CreateCommunityInviteDto) =>
    createdCommunityInviteResponseSchema.parse(
      (await apiClient.post<unknown>(`${base}/${id}/invites`, input)).data,
    ),
  revoke: async (id: string, inviteId: string) =>
    communityRevocationResponseSchema.parse(
      (await apiClient.delete(`${base}/${id}/invites/${inviteId}`)).data,
    ),
  preview: async (token: string, signal?: AbortSignal) =>
    communityInvitePreviewResponseSchema.parse(
      (
        await apiClient.get<unknown>(`${base}/invites/${encodeURIComponent(token)}`, {
          signal,
        })
      ).data,
    ),
  join: async (token: string) =>
    communityJoinResponseSchema.parse(
      (await apiClient.post<unknown>(`${base}/invites/${encodeURIComponent(token)}/accept`)).data,
    ),
  leave: async (id: string) =>
    communitySuccessResponseSchema.parse((await apiClient.delete(`${base}/${id}/membership`)).data),
  role: async (id: string, userId: string, role: 'ADMIN' | 'MEMBER') =>
    communitySuccessResponseSchema.parse(
      (await apiClient.patch(`${base}/${id}/members/${userId}`, { role })).data,
    ),
  kick: async (id: string, userId: string) =>
    communitySuccessResponseSchema.parse(
      (await apiClient.delete(`${base}/${id}/members/${userId}`)).data,
    ),
  ban: async (id: string, userId: string) =>
    communitySuccessResponseSchema.parse(
      (await apiClient.post(`${base}/${id}/members/${userId}/ban`)).data,
    ),
  unban: async (id: string, userId: string) =>
    communitySuccessResponseSchema.parse(
      (await apiClient.delete(`${base}/${id}/bans/${userId}`)).data,
    ),
  transfer: async (id: string, userId: string) =>
    communitySuccessResponseSchema.parse(
      (await apiClient.post(`${base}/${id}/transfer`, { userId })).data,
    ),
};
