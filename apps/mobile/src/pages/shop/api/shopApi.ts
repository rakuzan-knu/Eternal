import { getMobileApi } from '@/shared/api/client';
import { shopEndpoints, type CatalogDto, type InventoryDto, type ShopKind } from '../model/shop';

export const shopApi = {
  catalog: async <K extends ShopKind>(kind: K, signal: AbortSignal) =>
    (await getMobileApi().get<CatalogDto[K][]>(shopEndpoints[kind].path, { signal })).data,
  inventory: async <K extends ShopKind>(kind: K, signal: AbortSignal) =>
    (await getMobileApi().get<InventoryDto[K]>(`${shopEndpoints[kind].path}/me`, { signal })).data,
  equip: async <K extends ShopKind>(kind: K, id: string | null) =>
    (
      await getMobileApi().patch<InventoryDto[K]>(`${shopEndpoints[kind].path}/me/active`, {
        [shopEndpoints[kind].equipKey]: id,
      })
    ).data,
};
