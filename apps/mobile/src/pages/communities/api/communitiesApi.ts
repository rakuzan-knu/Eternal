import {
  communityChannelsResponseSchema,
  communityDirectoryResponseSchema,
  communityInvitePreviewResponseSchema,
  communityJoinResponseSchema,
  communityMembersResponseSchema,
  communitySuccessResponseSchema,
  communitySummaryResponseSchema,
  createdCommunityInviteResponseSchema,
  type CreateCommunityDto,
  type CreateCommunityInviteDto,
} from '@social-network/shared-contracts';
import { getMobileApi } from '@/shared/api/client';

const base = '/messenger/communities';
const path = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const communitiesApi = {
  directory: async (q: string, after: string | undefined, signal: AbortSignal) =>
    communityDirectoryResponseSchema.parse(
      (await getMobileApi().get<unknown>(base, { params: { q, after, limit: 12 }, signal })).data,
    ),
  mine: async (signal: AbortSignal) =>
    communityDirectoryResponseSchema.parse(
      (await getMobileApi().get<unknown>(`${base}/mine`, { params: { limit: 50 }, signal })).data,
    ),
  detail: async (id: string, signal: AbortSignal) =>
    communitySummaryResponseSchema.parse(
      (await getMobileApi().get<unknown>(path(id), { signal })).data,
    ),
  channels: async (id: string, signal: AbortSignal) =>
    communityChannelsResponseSchema.parse(
      (await getMobileApi().get<unknown>(`${path(id)}/channels`, { signal })).data,
    ),
  members: async (id: string, after: string | undefined, signal: AbortSignal) =>
    communityMembersResponseSchema.parse(
      (
        await getMobileApi().get<unknown>(`${path(id)}/members`, {
          params: { after, limit: 25 },
          signal,
        })
      ).data,
    ),
  create: async (input: CreateCommunityDto) =>
    communitySummaryResponseSchema.parse((await getMobileApi().post<unknown>(base, input)).data),
  invite: async (id: string, input: CreateCommunityInviteDto) =>
    createdCommunityInviteResponseSchema.parse(
      (await getMobileApi().post<unknown>(`${path(id)}/invites`, input)).data,
    ),
  preview: async (token: string, signal: AbortSignal) =>
    communityInvitePreviewResponseSchema.parse(
      (
        await getMobileApi().get<unknown>(`${base}/invites/${encodeURIComponent(token)}`, {
          signal,
        })
      ).data,
    ),
  join: async (token: string) =>
    communityJoinResponseSchema.parse(
      (await getMobileApi().post<unknown>(`${base}/invites/${encodeURIComponent(token)}/accept`))
        .data,
    ),
  leave: async (id: string) =>
    communitySuccessResponseSchema.parse(
      (await getMobileApi().delete<unknown>(`${path(id)}/membership`)).data,
    ),
};
