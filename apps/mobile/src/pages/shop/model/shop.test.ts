import { expect, it } from 'vitest';
import type {
  AvatarDecorationDto,
  ProfileFrameDto,
  ProfileFrameInventoryDto,
} from '@social-network/shared-contracts';
import { assetUri, filterItems, formatPrice, toInventory, toShopItem, type ShopItem } from './shop';

const decoration = {
  id: 'd1',
  name: 'Angel',
  slug: 'angel',
  description: 'A soft halo',
  assetType: 'animated_webp',
  assetUrl: '/deco/angel.webp',
  previewUrl: '/deco/angel.preview.webp',
  renderScale: 1.3,
  rarity: 'epic',
  priceCents: 199,
  isAvailable: true,
} as AvatarDecorationDto;

const frame = {
  id: 'f1',
  name: 'Rose',
  description: '',
  crownUrl: '/frames/rose.webp',
  crownPreviewUrl: '/frames/rose.preview.webp',
  rarity: 'rare',
  priceCents: 0,
  isAvailable: true,
} as ProfileFrameDto;

it('normalizes catalog items, using the crown art for frames', () => {
  expect(toShopItem('decoration', decoration)).toMatchObject({
    kind: 'decoration',
    previewUrl: '/deco/angel.preview.webp',
    renderScale: 1.3,
  });
  expect(toShopItem('frame', frame)).toMatchObject({
    kind: 'frame',
    previewUrl: '/frames/rose.preview.webp',
    assetUrl: '/frames/rose.webp',
  });
});

it('reads ownership and the active item from inventories', () => {
  const inventory = toInventory('frame', {
    activeProfileFrameId: 'f1',
    items: [{ profileFrame: frame, purchasedAt: '2025-01-01' }],
  } as ProfileFrameInventoryDto);
  expect(inventory.activeId).toBe('f1');
  expect(inventory.ownedIds.has('f1')).toBe(true);
});

it('resolves relative assets against the web origin', () => {
  expect(assetUri('/a.webp', 'https://web.example')).toBe('https://web.example/a.webp');
  expect(assetUri('a.webp', 'https://web.example')).toBe('https://web.example/a.webp');
  expect(assetUri('https://cdn.example/a.webp', 'https://web.example')).toBe(
    'https://cdn.example/a.webp',
  );
});

it('formats prices', () => {
  expect(formatPrice(0)).toBe('Free');
  expect(formatPrice(199)).toBe('$1.99');
});

it('filters by kind, ownership and search, hiding unavailable unowned items', () => {
  const items: ShopItem[] = [
    toShopItem('decoration', decoration),
    toShopItem('frame', frame),
    toShopItem('decoration', { ...decoration, id: 'd2', name: 'Retired', isAvailable: false }),
    toShopItem('decoration', { ...decoration, id: 'd3', name: 'Legend', rarity: 'legendary' }),
  ];
  const owned = (item: ShopItem) => item.id === 'f1' || item.id === 'd2';
  const ids = (list: ShopItem[]) => list.map((item) => item.id);
  expect(ids(filterItems(items, { kind: 'all', ownership: 'all', query: '', owned }))).toEqual([
    'd2',
    'f1',
    'd3',
    'd1',
  ]);
  expect(
    ids(filterItems(items, { kind: 'decoration', ownership: 'owned', query: '', owned })),
  ).toEqual(['d2']);
  expect(ids(filterItems(items, { kind: 'all', ownership: 'all', query: 'HALO', owned }))).toEqual([
    'd2',
    'd3',
    'd1',
  ]);
});
