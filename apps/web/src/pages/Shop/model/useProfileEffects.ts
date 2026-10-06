import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ProfileEffectDto,
  ProfileEffectInventoryDto,
  UserProfileDto,
} from '@social-network/shared-contracts';
import { apiClient } from '@/shared/api/httpClient';
import { queryKeys } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useProfileEffects() {
  const userId = useAuthStore((s) => s.userId),
    client = useQueryClient();
  const inventoryKey = queryKeys.profileEffects.inventory(userId);
  const catalog = useQuery({
    queryKey: queryKeys.profileEffects.catalog,
    queryFn: async () => (await apiClient.get<ProfileEffectDto[]>('/profile-effects')).data,
    staleTime: 30000,
  });
  const inventory = useQuery({
    queryKey: inventoryKey,
    enabled: Boolean(userId),
    staleTime: 30000,
    queryFn: async () =>
      (await apiClient.get<ProfileEffectInventoryDto>('/profile-effects/me')).data,
  });
  const equip = useMutation({
    onMutate: () => ({ inventoryKey, userId }),
    mutationFn: async (profileEffectId: string | null) =>
      (
        await apiClient.patch<ProfileEffectInventoryDto>('/profile-effects/me/active', {
          profileEffectId,
        })
      ).data,
    onSuccess: async (data, _variables, context) => {
      if (!context) return;
      client.setQueryData(context.inventoryKey, data);
      if (context.userId !== useAuthStore.getState().userId) return;
      const activeProfileEffect =
        data.items.find((i) => i.profileEffect.id === data.activeProfileEffectId)?.profileEffect ??
        null;
      client.setQueriesData<UserProfileDto>(
        { queryKey: queryKeys.user.current(context.userId) },
        (old) =>
          old
            ? { ...old, activeProfileEffectId: data.activeProfileEffectId, activeProfileEffect }
            : old,
      );
      await client.invalidateQueries({
        predicate: (q) => ['user', 'profile', 'miniProfile'].includes(String(q.queryKey[0])),
      });
    },
  });
  return { catalog, inventory, equip };
}
