import { z } from 'zod';

export const loginSchema = z.object({
  identity: z.string().refine(
    (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$|^[0-9]{10,12}$/;
      const cleanPhone = val.replace(/[\s\-()]/g, '');
      return emailRegex.test(val) || phoneRegex.test(cleanPhone);
    },
    {
      message: 'Please enter a valid email address or phone number.',
    },
  ),
  password: z.string().min(6, 'Password must contain at least 6 characters.'),
});

export type LoginFields = z.infer<typeof loginSchema>;
