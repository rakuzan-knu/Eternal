import { z } from 'zod';

export const REGISTRATION_TERMS_VERSION =
  '586655bd8a8d57b846a7ab78ed2c07e3f537d413ca9b7b6e742b49fac0d6a222';

export const registrationAdmissionSchema = z.strictObject({
  countryOfResidence: z.literal('UA'),
  termsVersion: z.literal(REGISTRATION_TERMS_VERSION, {
    error:
      'Terms updated. Reload this webpage or install the latest app version, then review the Terms before signing up. Умови оновлено. Перезавантажте вебсторінку або встановіть останню версію застосунку та перегляньте Умови перед реєстрацією.',
  }),
  acceptedTerms: z.literal(true),
  privacyNoticeAcknowledged: z.literal(true),
  contractingRole: z.enum(['SELF', 'PARENT_FOR_CHILD']),
  guardianApproval: z.boolean(),
});
export type RegistrationAdmission = z.infer<typeof registrationAdmissionSchema>;

export const registrationPolicySchema = z
  .object({
    minimumAge: z.literal(13),
    registrationOpen: z.boolean(),
    reviewedMarkets: z.array(z.literal('UA')).max(1),
    policyVersion: z.enum(['2026-11-05', '2026-11-08-ua-1']),
    reason: z.enum(['REGIONAL_REVIEW_PENDING', 'UKRAINE_SELF_REGISTRATION']),
  })
  .strict()
  .refine((policy) =>
    policy.registrationOpen
      ? policy.reviewedMarkets.length === 1 &&
        policy.reason === 'UKRAINE_SELF_REGISTRATION' &&
        policy.policyVersion === '2026-11-08-ua-1'
      : policy.reviewedMarkets.length === 0 && policy.reason === 'REGIONAL_REVIEW_PENDING',
  );

export type RegistrationPolicy = z.infer<typeof registrationPolicySchema>;

export function getRegistrationPolicy(open = false): RegistrationPolicy {
  return {
    minimumAge: 13,
    registrationOpen: open,
    reviewedMarkets: open ? ['UA'] : [],
    policyVersion: open ? '2026-11-08-ua-1' : '2026-11-05',
    reason: open ? 'UKRAINE_SELF_REGISTRATION' : 'REGIONAL_REVIEW_PENDING',
  };
}
