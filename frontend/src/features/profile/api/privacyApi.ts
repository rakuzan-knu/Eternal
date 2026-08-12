import { apiClient as api } from '@/shared/api/httpClient';
import type {
  DimensionExceptions,
  ExceptionMode,
  PrivacyDimension,
  PrivacySettings,
  PrivacyExceptionUser,
  UpdatePrivacyPayload,
} from '../model/privacyTypes';

export const privacyApi = {
  getPrivacy: () => api.get<PrivacySettings>('/users/me/privacy').then((r) => r.data),

  updatePrivacy: (payload: UpdatePrivacyPayload) =>
    api.patch<PrivacySettings>('/users/me/privacy', payload).then((r) => r.data),

  listExceptions: (dimension: PrivacyDimension) =>
    api
      .get<DimensionExceptions>('/users/me/privacy/exceptions', { params: { dimension } })
      .then((r) => r.data),

  addException: (dimension: PrivacyDimension, targetId: string, mode: ExceptionMode) =>
    api
      .post<PrivacyExceptionUser>('/users/me/privacy/exceptions', { dimension, targetId, mode })
      .then((r) => r.data),

  removeException: (dimension: PrivacyDimension, targetId: string) =>
    api.delete(`/users/me/privacy/exceptions/${dimension}/${targetId}`).then((r) => r.data),
};
