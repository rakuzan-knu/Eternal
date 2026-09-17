import { useMutation } from '@tanstack/react-query';
import { securityApi } from '../api/securityApi';

export function useDeleteAccount() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      securityApi.deleteAccount(userId, password),
  });
}
