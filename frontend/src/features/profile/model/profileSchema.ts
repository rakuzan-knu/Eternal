import { z } from 'zod';

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
  'system',
  'official',
  'account',
  'user',
  'test',
  'real',
  'verified',
  'mod',
  'moderator',
  'staff',
];

export const HARDENED_USERNAME_REGEX = /^(?![._])(?!.*[._]{2})[a-zA-Z0-9._]{2,32}(?<![._])$/;

export const profileSchema = z.object({
  displayName: z.string().max(32, 'Maximum 32 characters').optional().or(z.literal('')),
  username: z
    .string()
    .min(2, 'Minimum 2 characters')
    .max(32, 'Maximum 32 characters')
    .regex(
      HARDENED_USERNAME_REGEX,
      'Username must be 2-32 characters, cannot start/end with . or _, and cannot contain consecutive dots or underscores.',
    )
    .refine(
      (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
      'This username is reserved and cannot be used.',
    ),
  bio: z.string().max(200, 'Maximum 200 characters').optional().or(z.literal('')),
  onlineStatus: z.boolean(),
  notifMain: z.boolean(),
  notifSound: z.boolean(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
