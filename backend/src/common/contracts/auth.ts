import { z } from 'zod';

export const HARDENED_USERNAME_REGEX = /^(?![._])(?!.*[._]{2})[a-zA-Z0-9._]{2,32}(?<![._])$/;

export const RESERVED_USERNAMES = [
  'settings',
  'login',
  'register',
  'explore',
  'music',
  'messages',
  'messenger',
  'feed',
  'profile',
  'terms',
  'privacy',
  'notifications',
  'search',
  'reels',
  'create',
  'null',
  'undefined',
  'api',
  'auth',
  'admin',
  'support',
  'system',
  'official',
  'help',
  'staff',
  'moderator',
  'security',
  'eternal',
  'administrator',
  'me',
  'you',
  'root',
  'helpdesk',
  'contact',
  'info',
  'business',
  'marketing',
  'design',
  'developer',
  'engineering',
  'account',
  'user',
  'test',
  'real',
  'verified',
  'mod',
] as const;

export const loginSchema = z
  .object({
    email: z.string().email().optional(),
    identity: z.string().min(1).optional(),
    password: z.string().min(8),
  })
  .refine((data) => data.email || data.identity, {
    message: 'Either email or identity must be provided',
  });
export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z
    .string()
    .email()
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
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
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
