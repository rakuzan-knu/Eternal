import { z } from 'zod';

export const createFeatureFlagSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(
      /^[a-z0-9_.-]+$/,
      'Key must contain lowercase alphanumeric characters, underscores, dots, or hyphens',
    ),
  description: z.string().max(255).optional(),
  isEnabled: z.boolean().default(false),
  rolloutPercentage: z.number().int().min(0).max(100).default(0),
  targetUserIds: z.array(z.string().uuid()).default([]),
  targetRoles: z.array(z.string()).default([]),
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(32),
        weight: z.number().int().min(0).max(100),
      }),
    )
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateFeatureFlagDto = z.infer<typeof createFeatureFlagSchema>;

export const updateFeatureFlagSchema = createFeatureFlagSchema.partial().omit({ key: true });
export type UpdateFeatureFlagDto = z.infer<typeof updateFeatureFlagSchema>;

export class FeatureFlagEvaluationDto {
  enabled!: boolean;
  variant?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class EvaluateFlagsResponseDto {
  flags!: Record<string, FeatureFlagEvaluationDto>;
}

export class FeatureFlagAdminDto {
  id!: string;
  key!: string;
  description!: string | null;
  isEnabled!: boolean;
  rolloutPercentage!: number;
  targetUserIds!: string[];
  targetRoles!: string[];
  variants?: unknown;
  metadata?: unknown;
  createdAt!: string;
  updatedAt!: string;
}
