import { z } from 'zod';
import { RESERVED_USERNAMES, HARDENED_USERNAME_REGEX } from '../../profile/model/profileSchema';

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Enter first name')
    .max(32, 'First name cannot exceed 32 characters')
    .regex(/^[A-Za-zА-Яа-яЁёІіЇїЄєҐґ']+$/, 'The name can only contain letters.'),
  lastName: z
    .string()
    .min(1, 'Enter last name')
    .max(32, 'Last name cannot exceed 32 characters')
    .regex(/^[A-Za-zА-Яа-яЁёІіЇїЄєҐґ']+$/, 'Last name can only contain letters'),
  username: z
    .string()
    .transform((val) => (val.startsWith('@') ? val.slice(1) : val))
    .pipe(
      z
        .string()
        .min(2, 'Username must be at least 2 characters long')
        .max(32, 'Username cannot be longer than 32 characters.')
        .regex(
          HARDENED_USERNAME_REGEX,
          'Username must be 2-32 characters, cannot start/end with . or _, and cannot contain consecutive dots or underscores.',
        )
        .refine(
          (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
          'This username is reserved and cannot be used.',
        ),
    ),
  birthMonth: z.string().min(1, 'Select a month'),
  birthDay: z.string().min(1, 'Select a day'),
  birthYear: z.string().min(1, 'Select a year'),
  gender: z.string().refine((val) => ['Male', 'Female', 'Custom'].includes(val), {
    message: 'Select gender',
  }),
  identity: z.string().refine(
    (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^(\+?0|0)\d{9,14}$/;
      const cleanPhone = val.replace(/[\s\-()]/g, '');
      return emailRegex.test(val) || phoneRegex.test(cleanPhone);
    },
    {
      message: 'Please enter a valid email address or phone number.',
    },
  ),
  password: z
    .string()
    .min(8, 'The password must contain at least 8 characters.')
    .max(256, 'The password cannot exceed 256 characters.'),
});

export type RegisterFields = z.infer<typeof registerSchema>;
