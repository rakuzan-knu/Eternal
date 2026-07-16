import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Enter first name')
    .regex(/^[A-Za-zА-Яа-яЁёІіЇїЄєҐґ']+$/, 'The name can only contain letters.'),
  lastName: z
    .string()
    .min(1, 'Enter last name')
    .regex(/^[A-Za-zА-Яа-яЁёІіЇїЄєҐґ']+$/, 'Last name can only contain letters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .max(20, 'Username cannot be longer than 20 characters.')
    .startsWith('@', 'Username must start with @')
    .regex(/^@[a-zA-Z0-9_]+$/, 'Only letters, numbers, and the underscore character can be used'),
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
  password: z.string().min(6, 'The password must contain at least 6 characters.'),
});

export type RegisterFields = z.infer<typeof registerSchema>;
