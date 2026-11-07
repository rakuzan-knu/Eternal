import { z } from 'zod';

export const registrationPolicySchema = z
  .object({
    minimumAge: z.literal(13),
    registrationOpen: z.literal(false),
    reviewedMarkets: z.array(z.string()).length(0),
    policyVersion: z.literal('2026-11-05'),
    reason: z.literal('REGIONAL_REVIEW_PENDING'),
  })
  .strict();

export type RegistrationPolicy = z.infer<typeof registrationPolicySchema>;

export function getRegistrationPolicy(): RegistrationPolicy {
  return {
    minimumAge: 13,
    registrationOpen: false,
    reviewedMarkets: [],
    policyVersion: '2026-11-05',
    reason: 'REGIONAL_REVIEW_PENDING',
  };
}
