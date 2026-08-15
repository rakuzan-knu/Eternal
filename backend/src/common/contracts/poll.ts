import { z } from 'zod';

export const createPollSchema = z.object({
  postId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  isMultiple: z.boolean().optional(),
  expiresAt: z.string().optional(),
  options: z.array(z.string().min(1)).min(2),
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
