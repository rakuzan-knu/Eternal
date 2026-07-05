import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(2, 'Мінімум 2 символи').max(20, 'Максимум 20 символів'),
  username: z.string().min(3, 'Мінімум 3 символи').max(20),
  bio: z.string().max(160, 'Максимум 160 символів').optional(),
  onlineStatus: z.boolean(),
  notifMain: z.boolean(),
  notifSound: z.boolean(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
