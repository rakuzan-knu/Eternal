import { apiClient as api } from '@/shared/api/httpClient';
import {
  FamilyMembersResponse,
  FamilyActivitySummary,
  PendingPairRequest,
  ChildSafeguards,
  FamilyCenterSettings,
} from '../model/familyCenterTypes';

export const familyApi = {
  getMembers: async (signal?: AbortSignal): Promise<FamilyMembersResponse> => {
    const res = await api.get<FamilyMembersResponse>(
      '/family/members',
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  generatePairQr: async (
    signal?: AbortSignal,
  ): Promise<{ token: string; code: string; expiresAt: string }> => {
    const res = await api.post<{ token: string; code: string; expiresAt: string }>(
      '/family/invite/qr',
      {},
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  pair: async (
    code: string,
    signal?: AbortSignal,
  ): Promise<{ linkId: string; status: string; child: any }> => {
    const res = await api.post<{ linkId: string; status: string; child: any }>(
      '/family/pair',
      { code },
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  confirmPair: async (
    linkId: string,
    approved: boolean,
    signal?: AbortSignal,
  ): Promise<{ success: boolean; status: string }> => {
    const res = await api.post<{ success: boolean; status: string }>(
      '/family/confirm',
      { linkId, approved },
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  getPendingInvite: async (signal?: AbortSignal): Promise<PendingPairRequest | null> => {
    const res = await api.get<PendingPairRequest | null>(
      '/family/pending-invite',
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  revokeMember: async (
    linkId: string,
    signal?: AbortSignal,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(
      `/family/members/${linkId}`,
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  getActivitySummary: async (
    childId: string,
    signal?: AbortSignal,
  ): Promise<FamilyActivitySummary> => {
    const res = await api.get<FamilyActivitySummary>(
      `/family/children/${childId}/activity-summary`,
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  getMyActivity: async (signal?: AbortSignal): Promise<FamilyActivitySummary> => {
    const res = await api.get<FamilyActivitySummary>(
      '/family/my-activity',
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  getSafeguards: async (childId: string, signal?: AbortSignal): Promise<ChildSafeguards> => {
    const res = await api.get<ChildSafeguards>(
      `/family/children/${childId}/safeguards`,
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  updateSafeguards: async (
    childId: string,
    safeguards: Partial<ChildSafeguards>,
    signal?: AbortSignal,
  ): Promise<ChildSafeguards> => {
    // Automatically include user client device IANA timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const payload = {
      timezone,
      ...safeguards,
    };
    const res = await api.put<ChildSafeguards>(
      `/family/children/${childId}/safeguards`,
      payload,
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  getSettings: async (signal?: AbortSignal): Promise<FamilyCenterSettings> => {
    const res = await api.get<FamilyCenterSettings>(
      '/family/settings',
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  updateSettings: async (
    settings: Partial<FamilyCenterSettings>,
    signal?: AbortSignal,
  ): Promise<FamilyCenterSettings> => {
    const res = await api.put<FamilyCenterSettings>(
      '/family/settings',
      settings,
      ...(signal ? [{ signal }] : []),
    );
    return res.data;
  },

  generateInviteQr: async (signal?: AbortSignal) => familyApi.generatePairQr(signal),
  pairWithChild: async (code: string, signal?: AbortSignal) => familyApi.pair(code, signal),
  getChildActivity: async (childId: string, signal?: AbortSignal) =>
    familyApi.getActivitySummary(childId, signal),
  revokeLink: async (linkId: string, signal?: AbortSignal) =>
    familyApi.revokeMember(linkId, signal),
};
