import { useMutation, useQueryClient } from '@tanstack/react-query';
import { USER_KEY } from '@/shared/api/queryKeys';
import { apiClient } from '@/shared/api/httpClient';

interface UploadAvatarPayload {
  userId: string;
  file: File;
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, file }: UploadAvatarPayload) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(`/users/${userId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
    },
  });
}
