import type {
  AvatarDecorationDto,
  DecorationInventoryDto,
  NameplateDto,
  NameplateInventoryDto,
  ProfileEffectDto,
  ProfileEffectInventoryDto,
  ProfileFrameDto,
  ProfileFrameInventoryDto,
} from '@social-network/shared-contracts';
import { getLocale, type MessageKey, msg, tr } from '@/shared/lib/i18n';

export type ShopKind = 'decoration' | 'frame' | 'nameplate' | 'effect';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const SHOP_KINDS: { id: ShopKind; label: MessageKey; plural: MessageKey }[] = [
  { id: 'decoration', label: msg('Avatar decoration'), plural: msg('Avatar decorations') },
  { id: 'frame', label: msg('Profile frame'), plural: msg('Profile frames') },
  { id: 'nameplate', label: msg('Nameplate'), plural: msg('Nameplates') },
  { id: 'effect', label: msg('Profile effect'), plural: msg('Profile effects') },
];

export const kindLabel = (kind: ShopKind) => {
  const label = SHOP_KINDS.find((item) => item.id === kind)?.label;
  return label ? tr(label) : kind;
};

export const kindPlural = (kind: ShopKind) => {
  const label = SHOP_KINDS.find((item) => item.id === kind)?.plural;
  return label ? tr(label) : kind;
};

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  description: string;
  rarity: Rarity;
  priceCents: number;
  isAvailable: boolean;
  previewUrl: string;
  assetUrl: string;
  renderScale?: number;
  shadeOpacity?: number;
}

export interface Inventory {
  activeId: string | null;
  ownedIds: Set<string>;
}

export type CatalogDto = {
  decoration: AvatarDecorationDto;
  frame: ProfileFrameDto;
  nameplate: NameplateDto;
  effect: ProfileEffectDto;
};
export type InventoryDto = {
  decoration: DecorationInventoryDto;
  frame: ProfileFrameInventoryDto;
  nameplate: NameplateInventoryDto;
  effect: ProfileEffectInventoryDto;
};

export const shopEndpoints: Record<ShopKind, { path: string; equipKey: string }> = {
  decoration: { path: '/decorations', equipKey: 'decorationId' },
  frame: { path: '/profile-frames', equipKey: 'profileFrameId' },
  nameplate: { path: '/nameplates', equipKey: 'nameplateId' },
  effect: { path: '/profile-effects', equipKey: 'profileEffectId' },
};

export function toShopItem<K extends ShopKind>(kind: K, dto: CatalogDto[K]): ShopItem {
  const base = {
    id: dto.id,
    kind,
    name: dto.name,
    description: dto.description,
    rarity: dto.rarity,
    priceCents: dto.priceCents,
    isAvailable: dto.isAvailable,
  };
  if ('crownPreviewUrl' in dto)
    return { ...base, previewUrl: dto.crownPreviewUrl, assetUrl: dto.crownUrl };
  return {
    ...base,
    previewUrl: dto.previewUrl,
    assetUrl: dto.assetUrl,
    ...('renderScale' in dto && dto.renderScale ? { renderScale: dto.renderScale } : {}),
    ...('shadeOpacity' in dto ? { shadeOpacity: dto.shadeOpacity } : {}),
  };
}

export function toInventory<K extends ShopKind>(kind: K, dto: InventoryDto[K]): Inventory {
  switch (kind) {
    case 'decoration': {
      const value = dto as DecorationInventoryDto;
      return {
        activeId: value.activeDecorationId,
        ownedIds: new Set(value.items.map((item) => item.decoration.id)),
      };
    }
    case 'frame': {
      const value = dto as ProfileFrameInventoryDto;
      return {
        activeId: value.activeProfileFrameId,
        ownedIds: new Set(value.items.map((item) => item.profileFrame.id)),
      };
    }
    case 'nameplate': {
      const value = dto as NameplateInventoryDto;
      return {
        activeId: value.activeNameplateId,
        ownedIds: new Set(value.items.map((item) => item.nameplate.id)),
      };
    }
    default: {
      const value = dto as ProfileEffectInventoryDto;
      return {
        activeId: value.activeProfileEffectId,
        ownedIds: new Set(value.items.map((item) => item.profileEffect.id)),
      };
    }
  }
}

export function assetUri(url: string, origin: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function formatPrice(cents: number) {
  if (cents === 0) return tr('Free');
  return new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  );
}

const RARITY_LABEL: Record<Rarity, MessageKey> = {
  common: msg('Common'),
  rare: msg('Rare'),
  epic: msg('Epic'),
  legendary: msg('Legendary'),
};

export const rarityLabel = (rarity: Rarity) => tr(RARITY_LABEL[rarity]);

export const rarityColor: Record<Rarity, string> = {
  common: '#9ca3af',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
};

const rarityRank: Record<Rarity, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };

export type OwnershipFilter = 'all' | 'owned';

export function filterItems(
  items: ShopItem[],
  {
    kind,
    ownership,
    query,
    owned,
  }: {
    kind: ShopKind | 'all';
    ownership: OwnershipFilter;
    query: string;
    owned: (item: ShopItem) => boolean;
  },
) {
  const term = query.trim().toLowerCase();
  return items
    .filter((item) => kind === 'all' || item.kind === kind)
    .filter((item) => ownership === 'all' || owned(item))
    .filter((item) => item.isAvailable || owned(item))
    .filter(
      (item) =>
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term),
    )
    .sort(
      (a, b) =>
        Number(owned(b)) - Number(owned(a)) ||
        rarityRank[a.rarity] - rarityRank[b.rarity] ||
        a.name.localeCompare(b.name),
    );
}
