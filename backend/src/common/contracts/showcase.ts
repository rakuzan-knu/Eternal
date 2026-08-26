import { z } from 'zod';
import sanitizeHtmlLib from 'sanitize-html';

function sanitizeHtml(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return sanitizeHtmlLib(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

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
  posterUrl: z.string().url(),
  externalId: z.string().max(100).optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  rating: z.number().min(0).max(10).optional().nullable(),
  userComment: z
    .string()
    .max(120)
    .transform((val) => sanitizeHtml(val) as string)
    .optional()
    .nullable(),
  tags: showcaseTagListSchema,
  releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
  position: z.number().int().min(0).max(4).default(0),
});
export type ShowcaseMediaItemDto = z.infer<typeof showcaseMediaItemSchema>;

export const profileAnthemSchema = z.object({
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
  type: z.enum(['spotify', 'gaming', 'custom']),
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
  imageUrl: z.string().url().optional().nullable(),
  previewUrl: z.string().url().optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  startedAt: z.string().optional().nullable(),
  playtimeHours: z.number().min(0).optional().nullable(),
});
export type LiveActivityStatusDto = z.infer<typeof liveActivityStatusSchema>;

export const connectedAccountsSchema = z.object({
  github: z.string().max(50).optional().nullable(),
  steam: z.string().max(50).optional().nullable(),
  spotify: z.string().max(50).optional().nullable(),
  discord: z.string().max(50).optional().nullable(),
  twitch: z.string().max(50).optional().nullable(),
});
export type ConnectedAccountsDto = z.infer<typeof connectedAccountsSchema>;

export const updateShowcaseSchema = z.object({
  privacyMeta: showcasePrivacySchema.optional(),
  privacyActivity: showcasePrivacySchema.optional(),
  privacyShowcase: showcasePrivacySchema.optional(),
  privacyLinks: showcasePrivacySchema.optional(),
  showAge: z.boolean().optional(),
  showBirthdate: z.boolean().optional(),
  showGender: z.boolean().optional(),
  showTimezone: z.boolean().optional(),
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
});
export type ProfileShowcaseDto = z.infer<typeof profileShowcaseSchema>;
