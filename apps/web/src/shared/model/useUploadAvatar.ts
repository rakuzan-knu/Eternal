import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { apiClient } from '@/shared/api/httpClient';
import { prepareDirectUploadForm } from '@shared/api-client';

interface UploadAvatarPayload {
  userId: string;
  file: File;
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      file,
      signal,
    }: UploadAvatarPayload & { signal?: AbortSignal }) => {
      const formData = new FormData();
      formData.append('file', file);

      const body = await prepareDirectUploadForm(apiClient, formData, 'avatar', { signal });
      const response = await apiClient.post(`/users/${userId}/avatar`, body, { signal });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.root });
    },
  });
}
