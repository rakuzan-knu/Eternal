import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AvatarDecorationDto, DecorationInventoryDto } from '@social-network/shared-contracts';
import { apiClient } from '@/shared/api/httpClient';
import { queryKeys } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useActiveDecorationStore } from '@/shared/model/useActiveDecorationStore';

export function useDecorations() {
  const userId = useAuthStore((s) => s.userId);
  const client = useQueryClient();
  const catalog = useQuery({
    queryKey: queryKeys.decorations.catalog,
    queryFn: async () => (await apiClient.get<AvatarDecorationDto[]>('/decorations')).data,
    staleTime: 60000,
  });
  const inventoryKey = queryKeys.decorations.inventory(userId);
  const inventory = useQuery({
    queryKey: inventoryKey,
    queryFn: async () => (await apiClient.get<DecorationInventoryDto>('/decorations/me')).data,
    enabled: Boolean(userId),
  });
  const equip = useMutation({
    onMutate: () => ({ inventoryKey }),
    mutationFn: async (decorationId: string | null) =>
      (await apiClient.patch<DecorationInventoryDto>('/decorations/me/active', { decorationId }))
        .data,
    onSuccess: async (data, variables, context) => {
      // A response in flight belongs to the account that started the request.
      if (context) client.setQueryData(context.inventoryKey, data);
      const activeId = data?.activeDecorationId ?? variables;
      const dec = activeId
        ? (catalog.data?.find((d) => d.id === activeId) ??
          data?.items?.find((item) => item.decoration?.id === activeId)?.decoration ??
          null)
        : null;
      useActiveDecorationStore.getState().setActiveDecoration(dec);
      if (userId) {
        client.setQueriesData({ queryKey: queryKeys.user.current(userId) }, (old: any) =>
          old ? { ...old, activeDecorationId: activeId, activeDecoration: dec } : old,
        );
      }
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
