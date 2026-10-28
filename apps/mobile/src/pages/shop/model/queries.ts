import * as React from 'react';
import {
  useMutation,
  useQueries,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from '@social-network/shared-api-client';
import { shopApi } from '../api/shopApi';
import {
  SHOP_KINDS,
  toInventory,
  toShopItem,
  type Inventory,
  type InventoryDto,
  type ShopItem,
  type ShopKind,
} from './shop';

export const shopKeys = {
  all: (userId: string) => ['mobile', userId, 'shop'] as const,
  catalog: (userId: string, kind: ShopKind) => [...shopKeys.all(userId), 'catalog', kind] as const,
  inventory: (userId: string, kind: ShopKind) =>
    [...shopKeys.all(userId), 'inventory', kind] as const,
};

function combineCatalogs(results: UseQueryResult<ShopItem[]>[]) {
  return {
    items: results.flatMap((result) => result.data ?? []),
    isPending: results.every((result) => result.isPending),
    isPaused: results.every((result) => result.isPending && result.fetchStatus === 'paused'),
    failedKinds: SHOP_KINDS.filter((_, index) => results[index]?.isError).map(({ id }) => id),
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

function combineInventories(results: UseQueryResult<Inventory>[]) {
  return {
    byKind: new Map(
      SHOP_KINDS.flatMap(({ id }, index) => {
        const data = results[index]?.data;
        return data ? [[id, data] as [ShopKind, Inventory]] : [];
      }),
    ),
    failed: results.some((result) => result.isError),
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

export function useShop(userId: string) {
  const catalogs = useQueries({
    queries: SHOP_KINDS.map(({ id }) => ({
      queryKey: shopKeys.catalog(userId, id),
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await shopApi.catalog(id, signal)).map((dto) => toShopItem(id, dto)),
      staleTime: 60_000,
    })),
    combine: combineCatalogs,
  });
  const inventories = useQueries({
    queries: SHOP_KINDS.map(({ id }) => ({
      queryKey: shopKeys.inventory(userId, id),
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        toInventory(id, await shopApi.inventory(id, signal)),
      staleTime: 30_000,
    })),
    combine: combineInventories,
  });

  const { byKind } = inventories;
  const owned = React.useCallback(
    (item: ShopItem) => byKind.get(item.kind)?.ownedIds.has(item.id) ?? false,
    [byKind],
  );
  const equipped = React.useCallback(
    (item: ShopItem) => byKind.get(item.kind)?.activeId === item.id,
    [byKind],
  );

  return {
    items: catalogs.items,
    owned,
    equipped,
    isPending: catalogs.isPending,
    isPaused: catalogs.isPaused,
    failedKinds: catalogs.failedKinds,
    inventoryFailed: inventories.failed,
    refetch: () => Promise.all([catalogs.refetch(), inventories.refetch()]),
  };
}

export function useEquip(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ item, equip }: { item: ShopItem; equip: boolean }) =>
      shopApi.equip(item.kind, equip ? item.id : null),
    onSuccess: (data, { item }) => {
      client.setQueryData(
        shopKeys.inventory(userId, item.kind),
        toInventory(item.kind, data as InventoryDto[typeof item.kind]),
      );
      void client.invalidateQueries({
        queryKey: ['mobile', userId, ...queryKeys.users.all],
      });
    },
  });
}
