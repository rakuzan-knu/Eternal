import { z } from 'zod';

export const getFollowersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  after: z.string().max(128).optional(),
});
export type GetFollowersQueryDto = z.infer<typeof getFollowersQuerySchema>;

export const followResponseSchema = z.object({
  success: z.boolean(),
  status: z.enum(['following', 'pending', 'unfollowed']),
});
export type FollowResponseDto = z.infer<typeof followResponseSchema>;
