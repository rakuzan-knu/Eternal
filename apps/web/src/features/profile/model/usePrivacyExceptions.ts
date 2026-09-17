import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { privacyApi } from '../api/privacyApi';
import type { DimensionExceptions, ExceptionMode, PrivacyDimension } from './privacyTypes';

/** Server State: per-dimension privacy exceptions (short freshness). */
export function usePrivacyExceptions(dimension: PrivacyDimension, enabled = true) {
  return useQuery<DimensionExceptions>({
    queryKey: queryKeys.profile.privacyExceptions(dimension),
    queryFn: () => privacyApi.listExceptions(dimension),
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useAddException(dimension: PrivacyDimension) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetId, mode }: { targetId: string; mode: ExceptionMode }) =>
      privacyApi.addException(dimension, targetId, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.privacyExceptions(dimension),
      });
    },
  });
}

export function useRemoveException(dimension: PrivacyDimension) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetId: string) => privacyApi.removeException(dimension, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.privacyExceptions(dimension),
      });
    },
  });
}
