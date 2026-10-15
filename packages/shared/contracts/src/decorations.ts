import { z } from 'zod';

export const avatarDecorationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  assetType: z.enum(['animated_webp', 'css_canvas', 'lottie']),
  assetUrl: z.string(),
  previewUrl: z.string(),
  renderScale: z.number().positive().max(2).optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  priceCents: z.number().int().nonnegative(),
  isAvailable: z.boolean(),
});
export type AvatarDecorationDto = z.infer<typeof avatarDecorationSchema>;
export const equipDecorationSchema = z
  .object({ decorationId: z.string().min(1).max(128).nullable() })
  .strict();
export interface DecorationInventoryDto {
  activeDecorationId: string | null;
  items: { decoration: AvatarDecorationDto; purchasedAt: string }[];
}
