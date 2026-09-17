import { z } from 'zod';

import { isReservedUsername, HARDENED_USERNAME_REGEX, RESERVED_USERNAMES } from '@/entities/user';

export { isReservedUsername, HARDENED_USERNAME_REGEX, RESERVED_USERNAMES };

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
    .refine((val) => !isReservedUsername(val), 'This username is reserved and cannot be used.'),
  bio: z.string().max(200, 'Maximum 200 characters').optional().or(z.literal('')),
  onlineStatus: z.boolean(),
  notifMain: z.boolean(),
  notifSound: z.boolean(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
