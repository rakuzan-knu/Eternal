import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ProfileFrameDto,
  ProfileFrameInventoryDto,
  UserProfileDto,
} from '@social-network/shared-contracts';
import { apiClient } from '@/shared/api/httpClient';
import { queryKeys } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useProfileFrames() {
  const userId = useAuthStore((s) => s.userId),
    client = useQueryClient();
  const inventoryKey = queryKeys.profileFrames.inventory(userId);
  const catalog = useQuery({
    queryKey: queryKeys.profileFrames.catalog,
    queryFn: async () => (await apiClient.get<ProfileFrameDto[]>('/profile-frames')).data,
    staleTime: 30000,
  });
  const inventory = useQuery({
    queryKey: inventoryKey,
    enabled: Boolean(userId),
    staleTime: 30000,
    queryFn: async () => (await apiClient.get<ProfileFrameInventoryDto>('/profile-frames/me')).data,
  });
  const equip = useMutation({
    onMutate: () => ({ inventoryKey, userId }),
    mutationFn: async (profileFrameId: string | null) =>
      (
        await apiClient.patch<ProfileFrameInventoryDto>('/profile-frames/me/active', {
          profileFrameId,
        })
      ).data,
    onSuccess: async (data, _variables, context) => {
      if (!context) return;
      client.setQueryData(context.inventoryKey, data);
      if (context.userId !== useAuthStore.getState().userId) return;
      const activeProfileFrame =
        data.items.find((i) => i.profileFrame.id === data.activeProfileFrameId)?.profileFrame ??
        null;
      client.setQueriesData<UserProfileDto>(
        { queryKey: queryKeys.user.current(context.userId) },
        (old) =>
          old
            ? { ...old, activeProfileFrameId: data.activeProfileFrameId, activeProfileFrame }
            : old,
      );
      await client.invalidateQueries({
        predicate: (q) => ['user', 'profile', 'miniProfile'].includes(String(q.queryKey[0])),
      });
    },
  });
  return { catalog, inventory, equip };
}
