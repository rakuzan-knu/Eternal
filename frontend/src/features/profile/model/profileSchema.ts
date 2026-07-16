import { z } from 'zod';

export const profileSchema = z.object({
  displayName: z.string().min(2, 'Minimum 2 characters').max(20, 'Maximum 20 characters'),
  username: z.string().min(3, 'Minimum 3 characters').max(20),
  bio: z.string().max(160, 'Maximum 160 characters').optional(),
  onlineStatus: z.boolean(),
  notifMain: z.boolean(),
  notifSound: z.boolean(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
