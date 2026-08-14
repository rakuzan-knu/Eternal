import { useMutation, useQueryClient } from '@tanstack/react-query';
import { USER_KEY } from '@/shared/api/queryKeys';
import { apiClient } from '@/shared/api/httpClient';

interface UploadBannerPayload {
  userId: string;
  file: File;
  positionY: number;
}

export function useUploadBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, file, positionY }: UploadBannerPayload) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bannerPosition', positionY.toString());

      const response = await apiClient.post(`/users/${userId}/banner`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
    },
  });
}
