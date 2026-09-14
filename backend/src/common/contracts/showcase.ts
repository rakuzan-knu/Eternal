import { z } from 'zod';
import { sanitizeHtml } from './sanitize';

export const ShowcasePrivacy = {
  PUBLIC: 'PUBLIC',
  FOLLOWERS: 'FOLLOWERS',
  PRIVATE: 'PRIVATE',
} as const;
export type ShowcasePrivacy = (typeof ShowcasePrivacy)[keyof typeof ShowcasePrivacy];
export const showcasePrivacySchema = z.enum(['PUBLIC', 'FOLLOWERS', 'PRIVATE']);

export const ShowcaseMediaType = {
  ANIME: 'ANIME',
  GAME: 'GAME',
  MOVIE: 'MOVIE',
  SERIES: 'SERIES',
} as const;
export type ShowcaseMediaType = (typeof ShowcaseMediaType)[keyof typeof ShowcaseMediaType];
export const showcaseMediaTypeSchema = z.enum(['ANIME', 'GAME', 'MOVIE', 'SERIES']);

export const showcaseTagListSchema = z
  .array(z.string().max(25))
  .optional()
  .transform((tags) =>
    Array.from(
      new Set((tags || []).map((t) => (sanitizeHtml(t) as string).trim()).filter(Boolean)),
    ).slice(0, 5),
  );

export const showcaseMediaItemSchema = z.object({
  id: z.string().optional(),
  type: showcaseMediaTypeSchema,
  isWishlist: z.boolean().default(false),
  title: z
    .string()
    .min(1)
    .max(120)
    .transform((val) => sanitizeHtml(val) as string),
  posterUrl: z.string().min(1).max(1000),
  externalId: z.string().max(100).optional().nullable(),
  externalUrl: z.string().max(1000).optional().nullable(),
  rating: z.number().min(0).max(10).optional().nullable(),
  userComment: z
    .string()
    .max(120)
    .transform((val) => sanitizeHtml(val) as string)
    .optional()
    .nullable(),
  tags: showcaseTagListSchema,
  releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
  position: z.number().int().min(0).optional().default(0),
});
export type ShowcaseMediaItemDto = z.infer<typeof showcaseMediaItemSchema>;

export const profileAnthemSchema = z.object({
  id: z.string().optional().nullable(),
  trackId: z.string().optional().nullable(),
  title: z
    .string()
    .min(1)
    .max(100)
    .transform((val) => sanitizeHtml(val) as string),
  artist: z
    .string()
    .min(1)
    .max(100)
    .transform((val) => sanitizeHtml(val) as string),
  albumArt: z.string().url(),
  previewUrl: z.string().url().optional().nullable(),
  spotifyUrl: z.string().url().optional().nullable(),
  durationMs: z.number().int().positive().optional().nullable(),
});
export type ProfileAnthemDto = z.infer<typeof profileAnthemSchema>;

export const spotlightMediaSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(120)
    .transform((val) => sanitizeHtml(val) as string),
  posterUrl: z.string().url(),
  customBannerUrl: z.string().url().optional().nullable(),
  subtitle: z
    .string()
    .max(60)
    .transform((val) => sanitizeHtml(val) as string)
    .optional()
    .nullable(),
  tags: showcaseTagListSchema,
  rating: z.number().min(0).max(10).optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  type: showcaseMediaTypeSchema.default('GAME'),
});
export type SpotlightMediaDto = z.infer<typeof spotlightMediaSchema>;

export const liveActivityStatusSchema = z.object({
  type: z.enum(['spotify', 'gaming', 'custom', 'platform_music']),
  title: z
    .string()
    .max(100)
    .transform((val) => sanitizeHtml(val) as string),
  subtitle: z
    .string()
    .max(100)
    .transform((val) => sanitizeHtml(val) as string)
    .optional()
    .nullable(),
  details: z
    .string()
    .max(200)
    .transform((val) => sanitizeHtml(val) as string)
    .optional()
    .nullable(),
  imageUrl: z.string().optional().nullable(),
  headerUrl: z.string().optional().nullable(),
  gameId: z.string().optional().nullable(),
  previewUrl: z.string().optional().nullable(),
  externalUrl: z.string().optional().nullable(),
  startedAt: z.string().optional().nullable(),
  playtimeHours: z.number().min(0).optional().nullable(),
  isSteam: z.boolean().optional().nullable(),
  progressMs: z.number().min(0).optional().nullable(),
  durationMs: z.number().min(0).optional().nullable(),
  artist: z.string().optional().nullable(),
  trackId: z.string().optional().nullable(),
  updatedAt: z.number().optional().nullable(),
  isPaused: z.boolean().optional().nullable(),
  pausedAt: z.number().optional().nullable(),
  jamRoomId: z.string().optional().nullable(),
  isPlatformTrack: z.boolean().optional().nullable(),
  source: z.string().optional().nullable(),
});
export type LiveActivityStatusDto = z.infer<typeof liveActivityStatusSchema>;

export const connectedAccountsSchema = z.object({
  github: z.any().optional().nullable(),
  steam: z.any().optional().nullable(),
  riot: z.any().optional().nullable(),
  battlenet: z.any().optional().nullable(),
  spotify: z.any().optional().nullable(),
  soundcloud: z.any().optional().nullable(),
  youtube: z.any().optional().nullable(),
  twitch: z.any().optional().nullable(),
  roblox: z.any().optional().nullable(),
  x: z.any().optional().nullable(),
  facebook: z.any().optional().nullable(),
  epicgames: z.any().optional().nullable(),
  discord: z.any().optional().nullable(),
});
export type ConnectedAccountsDto = Record<string, any>;

export const familyMemberSchema = z.object({
  id: z.string(),
  userId: z.string().optional().nullable(),
  customName: z.string().max(100).optional().nullable(),
  role: z.string().max(50),
  isConfirmed: z.boolean().optional().default(false),
  // Hydrated fields (returned by getShowcase)
  name: z.string().optional(),
  username: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});
export type FamilyMemberDto = z.infer<typeof familyMemberSchema>;

export const personalInfoTogglesSchema = z.object({
  showRelationship: z.boolean().optional(),
  showLivesIn: z.boolean().optional(),
  showHometown: z.boolean().optional(),
  showWorkplace: z.boolean().optional(),
  showEducation: z.boolean().optional(),
  showLanguages: z.boolean().optional(),
  showFamily: z.boolean().optional(),
  showZodiac: z.boolean().optional(),
  showPronouns: z.boolean().optional(),
});
export type PersonalInfoTogglesDto = z.infer<typeof personalInfoTogglesSchema>;

export const personalInfoSchema = z.object({
  relationshipStatus: z.string().max(50).optional().nullable(),
  partner: z.string().max(100).optional().nullable(),
  partnerUserId: z.string().optional().nullable(),
  relationshipSince: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime()) && d.getTime() <= Date.now() + 86400000;
      },
      { message: 'Anniversary date cannot be in the future' },
    ),
  livesIn: z.string().max(100).optional().nullable(),
  hometown: z.string().max(100).optional().nullable(),
  workplace: z.string().max(100).optional().nullable(),
  workplaceRole: z.string().max(100).optional().nullable(),
  workplaceStatus: z.string().max(50).optional().nullable(),
  education: z.string().max(100).optional().nullable(),
  educationStatus: z.string().max(50).optional().nullable(),
  languages: z
    .union([z.string(), z.array(z.string().max(50)).max(10)])
    .optional()
    .nullable(),
  family: z.string().max(100).optional().nullable(),
  familyMembers: z.array(familyMemberSchema).max(20).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  toggles: personalInfoTogglesSchema.optional().nullable(),
});
export type PersonalInfoDto = z.infer<typeof personalInfoSchema>;

export const updateShowcaseSchema = z.object({
  privacyMeta: showcasePrivacySchema.optional(),
  privacyActivity: showcasePrivacySchema.optional(),
  privacyShowcase: showcasePrivacySchema.optional(),
  privacyLinks: showcasePrivacySchema.optional(),
  showAge: z.boolean().optional(),
  showBirthdate: z.boolean().optional(),
  showGender: z.boolean().optional(),
  showTimezone: z.boolean().optional(),
  showZodiac: z.boolean().optional(),
  pronouns: z
    .string()
    .max(20)
    .transform((val) => sanitizeHtml(val) as string)
    .optional()
    .nullable(),
  timezone: z
    .string()
    .max(50)
    .transform((val) => sanitizeHtml(val) as string)
    .optional()
    .nullable(),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color')
    .optional(),
  connectedAccounts: connectedAccountsSchema.optional().nullable(),
  activityStatus: liveActivityStatusSchema.optional().nullable(),
  spotlightMedia: spotlightMediaSchema.optional().nullable(),
  anthemTrack: profileAnthemSchema.optional().nullable(),
  mediaItems: z.array(showcaseMediaItemSchema).max(40).optional(),
  widgetOrder: z.array(z.string().max(50)).max(20).optional().nullable(),
  personalInfo: personalInfoSchema.optional().nullable(),
});
export type UpdateShowcaseDto = z.infer<typeof updateShowcaseSchema>;

export const mediaSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  posterUrl: z.string(),
  releaseYear: z.number().optional().nullable(),
  rating: z.number().optional().nullable(),
  type: showcaseMediaTypeSchema,
  externalUrl: z.string().optional().nullable(),
});
export type MediaSearchResultDto = z.infer<typeof mediaSearchResultSchema>;

export const profileShowcaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  hasVisibleWidgets: z.boolean(),
  relationship: z.enum(['SELF', 'FOLLOWER', 'PUBLIC']),
  privacyMeta: showcasePrivacySchema,
  privacyActivity: showcasePrivacySchema,
  privacyShowcase: showcasePrivacySchema,
  privacyLinks: showcasePrivacySchema,
  accentColor: z.string(),
  showAge: z.boolean(),
  showBirthdate: z.boolean(),
  showGender: z.boolean(),
  showTimezone: z.boolean(),
  showZodiac: z.boolean().optional(),
  pronouns: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  gender: z.string().nullable().optional(),
  zodiacSign: z.string().nullable().optional(),
  localTime: z.string().nullable().optional(),
  connectedAccounts: connectedAccountsSchema.nullable().optional(),
  activityStatus: liveActivityStatusSchema.nullable().optional(),
  spotlightMedia: spotlightMediaSchema.nullable().optional(),
  anthemTrack: profileAnthemSchema.nullable().optional(),
  mediaItems: z.array(showcaseMediaItemSchema),
  widgetOrder: z.array(z.string()).optional().nullable(),
  personalInfo: personalInfoSchema.optional().nullable(),
});
export type ProfileShowcaseDto = z.infer<typeof profileShowcaseSchema>;

export interface MediaDetailsResponseDto {
  title: string;
  subtitle?: string;
  description?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  videoDuration?: string;
  screenshots: string[];
  bannerUrl?: string;
  genres?: string;
  publisher?: string;
  developer?: string;
  releaseDate?: string;
  metacritic?: number;
  openCriticScore?: number;
  externalUrl?: string;
  similarItems?: Array<{
    title: string;
    posterUrl: string;
    type: ShowcaseMediaType;
    rating?: number;
    releaseYear?: number;
    subtitle?: string;
  }>;
}
