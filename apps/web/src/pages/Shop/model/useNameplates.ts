import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NameplateDto, NameplateInventoryDto } from '@social-network/shared-contracts';
import { apiClient } from '@/shared/api/httpClient';
import { queryKeys } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useActiveDecorationStore } from '@/shared/model/useActiveDecorationStore';

export function useNameplates() {
  const userId = useAuthStore((s) => s.userId);
  const client = useQueryClient();
  const inventoryKey = queryKeys.nameplates.inventory(userId);
  const catalog = useQuery({
    queryKey: queryKeys.nameplates.catalog,
    queryFn: async () => (await apiClient.get<NameplateDto[]>('/nameplates')).data,
    staleTime: 30000,
  });
  const inventory = useQuery({
    queryKey: inventoryKey,
    queryFn: async () => (await apiClient.get<NameplateInventoryDto>('/nameplates/me')).data,
    enabled: Boolean(userId),
    staleTime: 30000,
  });
  const equip = useMutation({
    onMutate: () => ({ inventoryKey, userId }),
    mutationFn: async (nameplateId: string | null) =>
      (await apiClient.patch<NameplateInventoryDto>('/nameplates/me/active', { nameplateId })).data,
    onSuccess: async (data, variables, context) => {
      if (context) client.setQueryData(context.inventoryKey, data);
      const activeId = data?.activeNameplateId ?? variables;
      const np = activeId
        ? (catalog.data?.find((d) => d.id === activeId) ??
          data?.items?.find((item) => item.nameplate?.id === activeId)?.nameplate ??
          null)
        : null;
      useActiveDecorationStore.getState().setActiveNameplate(np);
      if (context?.userId) {
        client.setQueriesData({ queryKey: queryKeys.user.current(context.userId) }, (old: any) =>
          old ? { ...old, activeNameplateId: activeId, activeNameplate: np } : old,
        );
      }
      if (context?.userId !== useAuthStore.getState().userId) return;
      await client.invalidateQueries({
        predicate: (q) =>
          [
            'user',
            'profile',
            'friends',
            'followList',
            'suggestedUsers',
            'user-search',
            'conversations',
            'conversation',
            'conversations-search',
          ].includes(String(q.queryKey[0])),
      });
    },
  });
  return { catalog, inventory, equip };
}
