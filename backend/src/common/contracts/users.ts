import { z } from 'zod';
import { AutoDeletePeriod, ExceptionMode, PrivacyDimension, Visibility } from '@prisma/client';
import sanitizeHtmlLib from 'sanitize-html';
import { HARDENED_USERNAME_REGEX, RESERVED_USERNAMES } from './auth';

function sanitizeHtml(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return sanitizeHtmlLib(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

export const LastSeenGranularity = {
  RECENTLY: 'RECENTLY',
  WITHIN_WEEK: 'WITHIN_WEEK',
  WITHIN_MONTH: 'WITHIN_MONTH',
  LONG_AGO: 'LONG_AGO',
} as const;
export type LastSeenGranularity = (typeof LastSeenGranularity)[keyof typeof LastSeenGranularity];

export const FollowStatusView = {
  NONE: 'none',
  PENDING: 'pending',
  FOLLOWING: 'following',
} as const;
export type FollowStatusView = (typeof FollowStatusView)[keyof typeof FollowStatusView];

export const updateUserSchema = z.object({
  email: z
    .string()
    .email()
    .transform((val) => val.trim().toLowerCase())
    .optional(),
  username: z
    .string()
    .min(2)
    .max(32)
    .regex(
      HARDENED_USERNAME_REGEX,
      'Username must be 2-32 characters, cannot start/end with . or _, and cannot contain consecutive dots or underscores.',
    )
    .refine(
      (val) =>
        !RESERVED_USERNAMES.includes(val.toLowerCase() as (typeof RESERVED_USERNAMES)[number]),
      {
        message: 'This username is reserved and cannot be used.',
      },
    )
    .transform((val) => sanitizeHtml(val.toLowerCase()) as string)
    .optional(),
  displayName: z
    .string()
    .max(32)
    .transform((val) => sanitizeHtml(val) as string)
    .optional(),
  bio: z
    .string()
    .max(200)
    .transform((val) => sanitizeHtml(val) as string)
    .optional(),
  bannerPosition: z.coerce.number().min(0).max(100).optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});
export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;

export const setUserAliasSchema = z.object({
  alias: z.string().min(1).max(64),
});
export type SetUserAliasDto = z.infer<typeof setUserAliasSchema>;

export const updatePrimaryBadgeSchema = z.object({
  badgeId: z.string().nullable().optional(),
});
export type UpdatePrimaryBadgeDto = z.infer<typeof updatePrimaryBadgeSchema>;

export const privacySettingsSchema = z.object({
  lastSeen: z.nativeEnum(Visibility),
  avatar: z.nativeEnum(Visibility),
  banner: z.nativeEnum(Visibility),
  forwardLink: z.nativeEnum(Visibility),
  calls: z.nativeEnum(Visibility),
  voiceMessages: z.nativeEnum(Visibility),
  messages: z.nativeEnum(Visibility),
  birthday: z.nativeEnum(Visibility),
  bio: z.nativeEnum(Visibility),
  groupInvites: z.nativeEnum(Visibility),
  isPrivate: z.boolean(),
  autoDeletePeriod: z.nativeEnum(AutoDeletePeriod),
  allowNearbyRecommendations: z.boolean().optional(),
});
export type PrivacySettingsDto = z.infer<typeof privacySettingsSchema>;

export const updatePrivacySchema = z.object({
  lastSeen: z.nativeEnum(Visibility).optional(),
  avatar: z.nativeEnum(Visibility).optional(),
  banner: z.nativeEnum(Visibility).optional(),
  forwardLink: z.nativeEnum(Visibility).optional(),
  calls: z.nativeEnum(Visibility).optional(),
  voiceMessages: z.nativeEnum(Visibility).optional(),
  messages: z.nativeEnum(Visibility).optional(),
  birthday: z.nativeEnum(Visibility).optional(),
  bio: z.nativeEnum(Visibility).optional(),
  groupInvites: z.nativeEnum(Visibility).optional(),
  isPrivate: z.boolean().optional(),
  autoDeletePeriod: z.nativeEnum(AutoDeletePeriod).optional(),
  allowNearbyRecommendations: z.boolean().optional(),
});
export type UpdatePrivacyDto = z.infer<typeof updatePrivacySchema>;

export const addPrivacyExceptionSchema = z.object({
  dimension: z.nativeEnum(PrivacyDimension),
  targetId: z.string().min(1),
  mode: z.nativeEnum(ExceptionMode),
});
export type AddPrivacyExceptionDto = z.infer<typeof addPrivacyExceptionSchema>;

export const recommendationMutualFriendSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
});
export type RecommendationMutualFriendDto = z.infer<typeof recommendationMutualFriendSchema>;

export const recommendationReasonSchema = z.object({
  type: z.enum(['MUTUAL_FRIENDS', 'NEARBY', 'SAME_CITY', 'POPULAR']),
  text: z.string(),
  mutualFriends: z.array(recommendationMutualFriendSchema).optional(),
  totalMutualCount: z.number().optional(),
});
export type RecommendationReasonDto = z.infer<typeof recommendationReasonSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
  avatar: z.string().nullable(),
  banner: z.string().nullable().optional(),
  bannerPosition: z.number().optional(),
  bio: z.string().nullable(),
  birthDate: z.string().nullable().optional(),
  isPrivate: z.boolean(),
  isVerified: z.boolean(),
  primaryBadge: z.string().nullable().optional(),
  badges: z.array(z.string()).optional(),
  githubUsername: z.string().nullable().optional(),
  mergedPrsCount: z.number().optional(),
  lastSeen: z
    .union([z.string(), z.nativeEnum(LastSeenGranularity)])
    .nullable()
    .optional(),
  lastSeenAt: z
    .union([z.string(), z.nativeEnum(LastSeenGranularity)])
    .nullable()
    .optional(),
  isOnline: z.boolean().optional(),
  followStatus: z.nativeEnum(FollowStatusView).optional(),
  autoDeletePeriod: z.nativeEnum(AutoDeletePeriod).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isFollowing: z.boolean().optional(),
  followsYou: z.boolean().optional(),
  isFriend: z.boolean().optional(),
  followersCount: z.number().optional(),
  postsCount: z.number().optional(),
  followingCount: z.number().optional(),
  alias: z.string().nullable().optional(),
  recommendationReason: recommendationReasonSchema.optional(),
});
export type UserProfileDto = z.infer<typeof userProfileSchema>;

export class CreateUserDto {
  readonly email: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly displayName?: string;
  readonly birthDate?: Date | null;

  constructor(props: {
    email: string;
    username: string;
    passwordHash: string;
    displayName?: string;
    birthDate?: Date | null;
  }) {
    this.email = props.email;
    this.username = props.username;
    this.passwordHash = props.passwordHash;
    this.displayName = props.displayName;
    this.birthDate = props.birthDate;
  }
}

export { AutoDeletePeriod, ExceptionMode, PrivacyDimension, Visibility };

export class PrivacyExceptionUserDto {
  id!: string;
  username!: string;
  displayName!: string | null;
  avatar!: string | null;
}

export class DimensionExceptionsDto {
  allow!: PrivacyExceptionUserDto[];
  deny!: PrivacyExceptionUserDto[];
}
