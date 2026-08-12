import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PRIVACY_KEY, USER_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { privacyApi } from '../api/privacyApi';
import type { PrivacySettings, UpdatePrivacyPayload } from './privacyTypes';

export function usePrivacy() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: [PRIVACY_KEY],
    queryFn: privacyApi.getPrivacy,
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });
}

export function useUpdatePrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePrivacyPayload) => privacyApi.updatePrivacy(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: [PRIVACY_KEY] });
      const previous = queryClient.getQueryData<PrivacySettings>([PRIVACY_KEY]);
      if (previous) {
        queryClient.setQueryData<PrivacySettings>([PRIVACY_KEY], { ...previous, ...payload });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) queryClient.setQueryData([PRIVACY_KEY], context.previous);
    },
    onSuccess: (data) => {
      queryClient.setQueryData([PRIVACY_KEY], data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PRIVACY_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
    },
  });
}
