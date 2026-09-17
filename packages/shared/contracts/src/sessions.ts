import { z } from 'zod';

export const sessionViewSchema = z.object({
  id: z.string(),
  deviceName: z.string().nullable(),
  ip: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  createdAt: z.date(),
  lastActiveAt: z.date(),
  isCurrent: z.boolean(),
});
export type SessionViewDto = z.infer<typeof sessionViewSchema>;
