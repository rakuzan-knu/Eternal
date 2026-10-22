import { z } from 'zod';

export const communityPageSchema = z.object({
  q: z.string().trim().max(100).optional(),
  after: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export const createCommunitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional(),
});
export const createCommunityChannelSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(1000).optional(),
    isPrivate: z.boolean().optional(),
    memberIds: z.array(z.string().uuid()).max(200).optional(),
  })
  .refine(
    (value) =>
      (!value.memberIds?.length || value.isPrivate === true) &&
      new Set(value.memberIds).size === (value.memberIds?.length ?? 0),
    'Private grants must be unique',
  );
export const createCommunityInviteSchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
  maxUses: z.coerce.number().int().min(1).max(10000).optional(),
});
export const communityRoleSchema = z.object({ role: z.enum(['ADMIN', 'MEMBER']) });
export const communityTransferSchema = z.object({ userId: z.string().uuid() });
export type CommunityPageQuery = z.infer<typeof communityPageSchema>;
export type CreateCommunityDto = z.infer<typeof createCommunitySchema>;
export type CreateCommunityChannelDto = z.infer<typeof createCommunityChannelSchema>;
export type CreateCommunityInviteDto = z.infer<typeof createCommunityInviteSchema>;
export type CommunityRoleDto = z.infer<typeof communityRoleSchema>;
export type CommunityTransferDto = z.infer<typeof communityTransferSchema>;
export type CommunityRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export const communityChannelAccessSchema = z
  .object({
    isPrivate: z.boolean(),
    memberIds: z
      .array(z.string().uuid())
      .max(200)
      .refine((ids) => new Set(ids).size === ids.length, 'Duplicate member IDs'),
    revision: z.number().int().min(0),
  })
  .refine(
    (value) => value.isPrivate || value.memberIds.length === 0,
    'Public channels cannot have explicit grants',
  );
export type CommunityChannelAccessDto = z.infer<typeof communityChannelAccessSchema>;
export const communityChannelArchiveSchema = z.object({
  archived: z.boolean(),
  revision: z.number().int().min(0),
});
export type CommunityChannelArchiveDto = z.infer<typeof communityChannelArchiveSchema>;
export const communityChannelLayoutSchema = z
  .object({
    revision: z.number().int().min(0),
    categories: z
      .array(z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) }))
      .max(50),
    channels: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(1000),
        categoryId: z.string().uuid().nullable(),
      }),
    ),
  })
  .superRefine((value, context) => {
    const categories = new Set(value.categories.map((item) => item.id));
    if (
      categories.size !== value.categories.length ||
      new Set(value.channels.map((item) => item.id)).size !== value.channels.length
    )
      context.addIssue({ code: 'custom', message: 'Duplicate category or channel IDs' });
    if (value.channels.some((item) => item.categoryId !== null && !categories.has(item.categoryId)))
      context.addIssue({ code: 'custom', message: 'Choose a category from this community' });
  });
export type CommunityChannelLayoutDto = z.infer<typeof communityChannelLayoutSchema>;
export interface CommunityCategoryDto {
  id: string;
  name: string;
  position: number;
}
export interface CommunitySummary {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  memberCount: number;
  createdAt: string;
}
export interface CommunityChannelDto {
  id: string;
  communityId: string;
  conversationId: string;
  name: string;
  description: string;
  position: number;
  categoryId?: string | null;
  archivedAt?: string | null;
  isPrivate?: boolean;
}
export interface CommunityMemberDto {
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: CommunityRole;
  state: 'ACTIVE' | 'LEFT' | 'BANNED';
}
export interface CommunityInviteDto {
  id: string;
  expiresAt: string;
  maxUses: number | null;
  useCount: number;
  revokedAt: string | null;
}
export interface CreatedCommunityInvite extends CommunityInviteDto {
  token: string;
}
export interface CommunityPage<T> {
  data: T[];
  nextCursor: string | null;
}
export interface CommunityChannelsResponse {
  communityId: string;
  role: CommunityRole;
  data: CommunityChannelDto[];
  categories?: CommunityCategoryDto[];
  revision?: number;
}
export interface CommunityInvitePreview {
  community: CommunitySummary;
  expiresAt: string;
}
export interface CommunityJoinResponse {
  communityId: string;
  joined: true;
  alreadyMember: boolean;
}

// Validate HTTP responses too: an HTML fallback or an older service must fail
// as a recoverable query error rather than crashing a screen or confirming a write.
export const communitySummaryResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  avatar: z.string().nullable(),
  memberCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
});
export const communityChannelResponseSchema = z.object({
  id: z.string().min(1),
  communityId: z.string().min(1),
  conversationId: z.string().min(1),
  name: z.string(),
  description: z.string(),
  position: z.number().int(),
  categoryId: z.string().nullable().default(null),
  archivedAt: z.string().datetime().nullable().default(null),
  isPrivate: z.boolean().default(false),
});
export const communityMemberResponseSchema = z.object({
  userId: z.string().min(1),
  username: z.string(),
  displayName: z.string().nullable(),
  avatar: z.string().nullable(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
  state: z.enum(['ACTIVE', 'LEFT', 'BANNED']),
});
export const communityInviteResponseSchema = z.object({
  id: z.string().min(1),
  expiresAt: z.string().datetime(),
  maxUses: z.number().int().positive().nullable(),
  useCount: z.number().int().min(0),
  revokedAt: z.string().datetime().nullable(),
});
export const createdCommunityInviteResponseSchema = communityInviteResponseSchema.extend({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export const communityDirectoryResponseSchema = z.object({
  data: z.array(communitySummaryResponseSchema),
  nextCursor: z.string().nullable(),
});
export const communityMembersResponseSchema = communityDirectoryResponseSchema.extend({
  data: z.array(communityMemberResponseSchema),
});
export const communityInvitesResponseSchema = communityDirectoryResponseSchema.extend({
  data: z.array(communityInviteResponseSchema),
});
export const communityChannelsResponseSchema = z.object({
  communityId: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
  data: z.array(communityChannelResponseSchema),
  categories: z
    .array(z.object({ id: z.string().min(1), name: z.string(), position: z.number().int() }))
    .default([]),
  revision: z.number().int().min(0).optional(),
});
export const communityChannelLayoutResponseSchema = communityChannelsResponseSchema.extend({
  revision: z.number().int().min(0),
});
export const communityInvitePreviewResponseSchema = z.object({
  community: communitySummaryResponseSchema,
  expiresAt: z.string().datetime(),
});
export const communityJoinResponseSchema = z.object({
  communityId: z.string().min(1),
  joined: z.literal(true),
  alreadyMember: z.boolean(),
});
export const communitySuccessResponseSchema = z.object({ success: z.literal(true) });
export const communityRevocationResponseSchema = z.object({ revoked: z.literal(true) });
