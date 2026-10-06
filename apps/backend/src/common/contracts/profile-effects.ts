import { z } from 'zod';

export const profileEffectSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  assetType: z.literal('animated_webp'),
  family: z.enum(['sword', 'dragon', 'racing']),
  variant: z.string(),
  assetUrl: z.string(),
  previewUrl: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  durationMs: z.number().int().positive(),
  avatarAnchorX: z.number().min(0).max(1),
  avatarAnchorY: z.number().min(0).max(1),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  priceCents: z.number().int().nonnegative(),
  isAvailable: z.boolean(),
});
export type ProfileEffectDto = z.infer<typeof profileEffectSchema>;
export const equipProfileEffectSchema = z
  .object({ profileEffectId: z.string().min(1).max(128).nullable() })
  .strict();
export interface ProfileEffectInventoryDto {
  activeProfileEffectId: string | null;
  items: { profileEffect: ProfileEffectDto; purchasedAt: string }[];
}
