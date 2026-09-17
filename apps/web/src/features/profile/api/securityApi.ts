import { apiClient as api } from '@/shared/api/httpClient';
import type { ChangePasswordDto, DeleteAccountDto } from '@backend/common/contracts';

export type ChangePasswordPayload = ChangePasswordDto;

export const securityApi = {
  changePassword: (payload: ChangePasswordPayload) =>
    api.post('/auth/change-password', payload).then((r) => r.data),
  deleteAccount: (userId: string, password: string) =>
    api
      .delete(`/users/${userId}`, { data: { password } satisfies DeleteAccountDto })
      .then((r) => r.data),
};
