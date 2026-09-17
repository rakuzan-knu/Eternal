import { z } from 'zod';

export const createPollSchema = z.object({
  postId: z.string().min(1).max(128),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  isMultiple: z.boolean().optional(),
  expiresAt: z.string().max(64).optional(),
  options: z.array(z.string().min(1).max(255)).min(2).max(10),
});
export type CreatePollDto = z.infer<typeof createPollSchema>;

export const pollOptionResponseSchema = z.object({
  id: z.string(),
  optionText: z.string(),
  votesCount: z.number(),
});
export type PollOptionResponseDto = z.infer<typeof pollOptionResponseSchema>;

export const pollResponseSchema = z.object({
  id: z.string(),
  postId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  isMultiple: z.boolean(),
  isActive: z.boolean(),
  options: z.array(pollOptionResponseSchema),
  totalVotes: z.number(),
  userVotedOptionIds: z.array(z.string()).optional(),
});
export type PollResponseDto = z.infer<typeof pollResponseSchema>;
