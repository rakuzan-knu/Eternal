import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { privacyApi } from '../api/privacyApi';
import type { PrivacySettings, UpdatePrivacyPayload } from './privacyTypes';

/** Server State: privacy settings (per-user, 60s freshness). */
export function usePrivacy() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<PrivacySettings>({
    queryKey: queryKeys.profile.privacy,
    queryFn: privacyApi.getPrivacy,
    enabled: isAuthenticated,
    staleTime: queryStaleTimes.feed,
  });
}

export function useUpdatePrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePrivacyPayload) => privacyApi.updatePrivacy(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.privacy });
      const previous = queryClient.getQueryData<PrivacySettings>(queryKeys.profile.privacy);
      if (previous) {
        queryClient.setQueryData<PrivacySettings>(queryKeys.profile.privacy, {
          ...previous,
          ...payload,
        });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.profile.privacy, context.previous);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile.privacy, data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.privacy });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.root });
    },
  });
}
