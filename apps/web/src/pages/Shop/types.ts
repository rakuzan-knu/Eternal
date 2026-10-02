export type ShopCategory =
  | 'Avatar Decorations'
  | 'Nameplates'
  | 'Profile Effects'
  | 'Profile Frames'
  | 'Bundles'
  | 'Collabs'
  | 'Shop All';

export type ShopTab = 'Featured' | 'Browse' | 'Orbs Exclusives' | 'Game Shops' | 'Halloween Promo';

export interface ShopItem {
  id: string;
  name: string;
  category:
    | 'Avatar Decorations'
    | 'Nameplates'
    | 'Profile Effects'
    | 'Profile Frames'
    | 'Bundles'
    | 'Collabs';
  collection: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  currency: 'USD' | 'Orbs';
  orbPrice?: number;
  description: string;
  itemsIncludedCount?: number;
  itemsIncludedNames?: string[];
  previewType: 'bundle' | 'avatar-decoration' | 'profile-effect' | 'nameplate' | 'profile-frame';
  previewColor: string;
  previewGlow: string;
  isFeatured?: boolean;
  isQuestEligible?: boolean;
  isHalloweenPromo?: boolean;
  isOrbExclusive?: boolean;
  gameShopName?: string;
  tags: string[];
}
