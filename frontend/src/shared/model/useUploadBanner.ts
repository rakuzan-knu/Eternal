import { useMutation, useQueryClient } from '@tanstack/react-query';
import { USER_KEY } from '@/shared/api/queryKeys';

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

      const token = localStorage.getItem('accessToken');

      const response = await fetch(`/api/users/${userId}/banner`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load banner');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
    },
  });
}
