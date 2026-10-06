import { z } from 'zod';

export const profileFrameSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  family: z.enum(['dragon', 'rose', 'blade', 'crystal', 'celestial', 'cat', 'racing']),
  variant: z.string(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  crownUrl: z.string(),
  crownPreviewUrl: z.string(),
  cornerUrl: z.string(),
  railUrl: z.string(),
  footerUrl: z.string(),
  vehicleAtlasUrl: z.string().nullable().optional(),
  vehiclePreviewUrl: z.string().nullable().optional(),
  animated: z.boolean(),
  fps: z.number().nonnegative(),
  durationMs: z.number().int().positive(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  priceCents: z.number().int().nonnegative(),
  isAvailable: z.boolean(),
});
export type ProfileFrameDto = z.infer<typeof profileFrameSchema>;
export const equipProfileFrameSchema = z
  .object({ profileFrameId: z.string().min(1).max(128).nullable() })
  .strict();
export interface ProfileFrameInventoryDto {
  activeProfileFrameId: string | null;
  items: { profileFrame: ProfileFrameDto; purchasedAt: string }[];
}
