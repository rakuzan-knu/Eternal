import { z } from 'zod';

export const nameplateSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  assetType: z.literal('video'),
  assetUrl: z.string(),
  previewUrl: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  durationMs: z.number().int().positive(),
  shadeOpacity: z.number().min(0).max(0.75),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  priceCents: z.number().int().nonnegative(),
  isAvailable: z.boolean(),
});
export type NameplateDto = z.infer<typeof nameplateSchema>;
export const equipNameplateSchema = z
  .object({ nameplateId: z.string().min(1).max(128).nullable() })
  .strict();
export interface NameplateInventoryDto {
  activeNameplateId: string | null;
  items: { nameplate: NameplateDto; purchasedAt: string }[];
}
