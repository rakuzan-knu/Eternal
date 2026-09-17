import { z } from 'zod';

export const HARDENED_USERNAME_REGEX = /^(?![._])(?!.*[._]{2})[a-zA-Z0-9._]{2,32}(?<![._])$/;

export const RESERVED_USERNAMES = [
  // Core System & Brand
  'eternal',
  'eternalnet',
  'theeternalnet',
  'eternalsocial',
  'theeternal',
  'admin',
  'administrator',
  'root',
  'mod',
  'moderator',
  'staff',
  'official',
  'system',
  'support',
  'security',
  'help',
  'helpdesk',
  'contact',
  'info',
  'team',
  'legal',
  'compliance',
  'billing',
  'press',
  'verified',
  'real',
  'test',
  'me',
  'you',
  'user',
  'account',
  'null',
  'undefined',

  // Core App Routes & Features
  'feed',
  'messages',
  'messenger',
  'chat',
  'explore',
  'search',
  'notifications',
  'settings',
  'profile',
  'reels',
  'music',
  'create',
  'saved',
  'bookmarks',
  'activity',
  'direct',
  'login',
  'signin',
  'signup',
  'register',
  'logout',
  'auth',
  'oauth',
  'forgot-password',
  'reset-password',
  'password',
  'download',
  'downloads',
  'apps',
  'install',
  'pwa',
  'desktop',
  'mobile',
  'web',

  // Company, Brand, Creators & Blog
  'about',
  'company',
  'company-information',
  'careers',
  'jobs',
  'brand',
  'branding',
  'news',
  'newsroom',
  'blog',
  'category',
  'creators',
  'guidelines',
  'rules',
  'community',

  // Safety & Trust Center
  'safety',
  'family',
  'family-center',
  'library',
  'safety-library',
  'privacy-hub',
  'transparency',
  'safety-news',
  'policies',
  'policy-hub',
  'teen-charter',
  'wellbeing',
  'law-enforcement',
  'law',
  'police',
  'faq',
  'help-center',
  'support-center',

  // Legal, Privacy & Terms
  'privacy',
  'privacy-policy',
  'terms',
  'terms-of-service',
  'tos',
  'cookie',
  'cookie-policy',
  'cookies',
  'regional-privacy',
  'gdpr',
  'ccpa',
  'retention',
  'retention-policy',
  'data-privacy-controls',
  'your-eternal-data-package',
  'your-data-package',
  'data',
  'export',
  'paid-services',
  'developer',
  'api',
  'developers',
  'applicant-candidate-privacy-policy',
  'applicant-privacy',
  'copyright',
  'dmca',
  'acknowledgements',
  'licenses',
  'license',
  'business',
  'marketing',
  'design',
  'engineering',

  // Technical & SEO Endpoints
  'sitemap',
  'sitemap.xml',
  'sitemap-static.xml',
  'robots.txt',
  'opensearch.xml',
  'security.txt',
  'well-known',
  'llms.txt',
  'llms-full.txt',
  'favicon.ico',
  'favicon.svg',
  'manifest.json',
  'graphql',
  'websocket',
  'ws',
  'socket',
  'cdn',
  'media',
  'static',
  'assets',
  'uploads',
  'avatars',
  'banners',
] as const;

export const loginSchema = z
  .object({
    email: z.string().email().max(255).optional(),
    identity: z.string().min(1).max(255).optional(),
    password: z.string().min(8).max(128),
    turnstileToken: z.string().max(2048).optional(),
  })
  .refine((data) => data.email || data.identity, {
    message: 'Either email or identity must be provided',
  });
export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((val) => val.trim().toLowerCase()),
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
    .transform((val) => val.replace(/^@+/, '').trim().toLowerCase()),
  displayName: z.string().max(64).optional(),
  password: z.string().min(8).max(128),
  birthDate: z.string().datetime().optional(),
  turnstileToken: z.string().max(2048).optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(4096),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const checkUsernameSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(32)
    .transform((val) => val.replace(/^@+/, '').trim().toLowerCase()),
});
export type CheckUsernameDto = z.infer<typeof checkUsernameSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    displayName: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    role: z.string().optional(),
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
