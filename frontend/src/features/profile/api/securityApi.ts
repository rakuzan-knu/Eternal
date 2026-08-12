import { apiClient as api } from '@/shared/api/httpClient';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const securityApi = {
  changePassword: (payload: ChangePasswordPayload) =>
    api.post('/auth/change-password', payload).then((r) => r.data),
  deleteAccount: (userId: string, password: string) =>
    api.delete(`/users/${userId}`, { data: { password } }).then((r) => r.data),
};
