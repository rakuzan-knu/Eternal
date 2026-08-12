import { useMutation } from '@tanstack/react-query';
import { securityApi, type ChangePasswordPayload } from '../api/securityApi';

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => securityApi.changePassword(payload),
  });
}
