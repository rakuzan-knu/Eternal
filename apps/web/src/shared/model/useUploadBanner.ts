import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { apiClient } from '@/shared/api/httpClient';

interface UploadBannerPayload {
  userId: string;
  file: File;
  positionY: number;
}

export function useUploadBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      file,
      positionY,
      signal,
    }: UploadBannerPayload & { signal?: AbortSignal }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bannerPosition', positionY.toString());

      const response = await apiClient.post(`/users/${userId}/banner`, formData, { signal });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.root });
    },
  });
}
