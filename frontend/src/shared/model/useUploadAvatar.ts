import { useMutation, useQueryClient } from '@tanstack/react-query';
import { USER_KEY } from '@/shared/api/queryKeys';

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

      const token = localStorage.getItem('accessToken');

      const response = await fetch(`/api/users/${userId}/avatar`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load avatar');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
    },
  });
}
