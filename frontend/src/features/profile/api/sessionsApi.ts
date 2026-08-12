import { apiClient as api } from '@/shared/api/httpClient';
import type { SessionView } from '../model/privacyTypes';

export const sessionsApi = {
  list: () => api.get<SessionView[]>('/auth/sessions').then((r) => r.data),

  revoke: (id: string) => api.delete(`/auth/sessions/${id}`).then((r) => r.data),

  revokeAllOthers: () => api.delete('/auth/sessions').then((r) => r.data),
};
