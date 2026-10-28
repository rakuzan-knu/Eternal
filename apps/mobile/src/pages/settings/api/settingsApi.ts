import type {
  ChangePasswordDto,
  DimensionExceptionsDto,
  ExceptionMode,
  NotificationSettingsDto,
  PrivacyDimension,
  PrivacyExceptionUserDto,
  PrivacySettingsDto,
  ProfileShowcaseDto,
  ShowcasePrivacy,
  UpdateShowcaseDto,
  UpdateNotificationSettingsDto,
  UpdatePrivacyDto,
  UpdateUserDto,
  UserProfileDto,
} from '@social-network/shared-contracts';
import type { ImagePickerAsset } from 'expo-image-picker';
import { getMobileApi } from '@/shared/api/client';
import { appendUploadField, prepareMobileUploadForm } from '../../feed/api/directUploadForm';
import { appendAsset } from '../../feed/api/postForm';

export interface SessionView {
  id: string;
  deviceName: string | null;
  ip: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export type PrivacySettings = PrivacySettingsDto;

export interface FamilySafeguards {
  childId: string;
  dailyLimitMinutes: number;
  curfewStart: string | null;
  curfewEnd: string | null;
  timezone: string;
  restrictedDirectMessages: boolean;
  monthlyBudget: number;
  spentThisMonth: number;
  requirePurchaseApproval: boolean;
  profileSettingsLocked: boolean;
  profileLockedByParent?: boolean;
}

export interface FamilyMember {
  id: string;
  linkId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  age: number;
  status: 'online' | 'idle' | 'offline';
  connectedAt: string;
}

export interface FamilyMembers {
  role: 'parent' | 'child';
  connectedChildren: FamilyMember[];
  connectedParents: FamilyMember[];
  maxChildren: number;
  maxParents: number;
}

export interface FamilyPendingInvite {
  linkId: string;
  parentUsername: string;
  parentDisplayName: string;
  parentAvatar: string | null;
  expiresAt: string;
}

export interface FamilyActivity {
  periodDays: number;
  newFriendsCount: number;
  messagingUsersCount: number;
  voiceVideoMinutes: number;
  purchaseAmount: number;
  giftsReceivedCount: number;
  reportsSharedCount: number;
}

export interface FamilySettings {
  weeklyDigest: boolean;
  newFriendAlerts: boolean;
  reportAlerts: boolean;
  notifyLinkRequests: boolean;
}

const userPath = (id: string) => `/users/${encodeURIComponent(id)}`;

async function uploadImage(
  path: string,
  purpose: 'avatar' | 'banner',
  asset: ImagePickerAsset,
  extra?: Record<string, string>,
) {
  const api = getMobileApi();
  const form = new FormData();
  await appendAsset(form, 'file', asset);
  for (const [key, value] of Object.entries(extra ?? {})) appendUploadField(form, key, value);
  const body = await prepareMobileUploadForm(api, form, purpose);
  return (await api.post<{ url?: string; avatar?: string; banner?: string }>(path, body)).data;
}

export const settingsApi = {
  me: async (signal: AbortSignal) =>
    (await getMobileApi().get<UserProfileDto>('/users/me', { signal })).data,
  updateProfile: async (userId: string, dto: UpdateUserDto) =>
    (await getMobileApi().patch<UserProfileDto>(userPath(userId), dto)).data,
  checkUsername: async (username: string, signal: AbortSignal) =>
    (
      await getMobileApi().get<{ isAvailable: boolean }>('/auth/check-username', {
        params: { username },
        signal,
      })
    ).data,
  uploadAvatar: (userId: string, asset: ImagePickerAsset) =>
    uploadImage(`${userPath(userId)}/avatar`, 'avatar', asset),
  removeAvatar: async (userId: string) => {
    await getMobileApi().delete(`${userPath(userId)}/avatar`);
  },
  uploadBanner: (userId: string, asset: ImagePickerAsset) =>
    uploadImage(`${userPath(userId)}/banner`, 'banner', asset, { bannerPosition: '50' }),
  privacy: async (signal: AbortSignal) =>
    (await getMobileApi().get<PrivacySettings>('/users/me/privacy', { signal })).data,
  updatePrivacy: async (dto: UpdatePrivacyDto) =>
    (await getMobileApi().patch<PrivacySettings>('/users/me/privacy', dto)).data,
  exceptions: async (dimension: PrivacyDimension, signal: AbortSignal) =>
    (
      await getMobileApi().get<DimensionExceptionsDto>('/users/me/privacy/exceptions', {
        params: { dimension },
        signal,
      })
    ).data,
  addException: async (dimension: PrivacyDimension, targetId: string, mode: ExceptionMode) =>
    (
      await getMobileApi().post<PrivacyExceptionUserDto>('/users/me/privacy/exceptions', {
        dimension,
        targetId,
        mode,
      })
    ).data,
  removeException: async (dimension: PrivacyDimension, targetId: string) => {
    await getMobileApi().delete(
      `/users/me/privacy/exceptions/${dimension}/${encodeURIComponent(targetId)}`,
    );
  },
  sessions: async (signal: AbortSignal) =>
    (await getMobileApi().get<SessionView[]>('/auth/sessions', { signal })).data,
  revokeSession: async (id: string) => {
    await getMobileApi().delete(`/auth/sessions/${encodeURIComponent(id)}`);
  },
  revokeOtherSessions: async () => {
    await getMobileApi().delete('/auth/sessions');
  },
  changePassword: async (dto: ChangePasswordDto) => {
    await getMobileApi().post('/auth/change-password', dto);
  },
  verifyPassword: async (password: string) =>
    (await getMobileApi().post<{ valid: boolean }>('/auth/verify-password', { password })).data,
  deleteAccount: async (userId: string, password: string) => {
    await getMobileApi().delete(userPath(userId), { data: { password } });
  },
  showcase: async (username: string, signal: AbortSignal) =>
    (
      await getMobileApi().get<ProfileShowcaseDto>(
        `/users/${encodeURIComponent(username)}/showcase`,
        { signal },
      )
    ).data,
  updateShowcase: async (dto: UpdateShowcaseDto) =>
    (await getMobileApi().patch<ProfileShowcaseDto>('/users/me/showcase', dto)).data,
  setPrimaryBadge: async (badgeId: string | null) =>
    (await getMobileApi().patch<UserProfileDto>('/users/primary-badge', { badgeId })).data,
  unlinkIntegration: async (platform: string, githubLinked: boolean) => {
    if (platform === 'github' && githubLinked) await getMobileApi().delete('/auth/github');
    await getMobileApi().delete(`/integrations/${encodeURIComponent(platform)}/unlink`);
  },
  family: {
    members: async (signal: AbortSignal) =>
      (await getMobileApi().get<FamilyMembers>('/family/members', { signal })).data,
    pending: async (signal: AbortSignal) =>
      (await getMobileApi().get<FamilyPendingInvite | null>('/family/pending-invite', { signal }))
        .data,
    createCode: async () =>
      (
        await getMobileApi().post<{ token: string; code: string; expiresAt: string }>(
          '/family/invite/qr',
          {},
        )
      ).data,
    pair: async (code: string) => {
      await getMobileApi().post('/family/pair', { code });
    },
    confirm: async (linkId: string, approved: boolean) => {
      await getMobileApi().post('/family/confirm', { linkId, approved });
    },
    revoke: async (linkId: string) => {
      await getMobileApi().delete(`/family/members/${encodeURIComponent(linkId)}`);
    },
    activity: async (childId: string | null, signal: AbortSignal) =>
      (
        await getMobileApi().get<FamilyActivity>(
          childId
            ? `/family/children/${encodeURIComponent(childId)}/activity-summary`
            : '/family/my-activity',
          { signal },
        )
      ).data,
    safeguards: async (childId: string, signal: AbortSignal) =>
      (
        await getMobileApi().get<FamilySafeguards>(
          `/family/children/${encodeURIComponent(childId)}/safeguards`,
          { signal },
        )
      ).data,
    updateSafeguards: async (childId: string, patch: Partial<FamilySafeguards>) =>
      (
        await getMobileApi().put<FamilySafeguards>(
          `/family/children/${encodeURIComponent(childId)}/safeguards`,
          { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', ...patch },
        )
      ).data,
    settings: async (signal: AbortSignal) =>
      (await getMobileApi().get<FamilySettings>('/family/settings', { signal })).data,
    updateSettings: async (patch: Partial<FamilySettings>) =>
      (await getMobileApi().put<FamilySettings>('/family/settings', patch)).data,
  },
  hideShowcase: async (privacy: ShowcasePrivacy) => {
    await getMobileApi().patch('/users/me/showcase', {
      privacyMeta: privacy,
      privacyActivity: privacy,
      privacyShowcase: privacy,
      privacyLinks: privacy,
    });
  },
  notifications: async (signal: AbortSignal) =>
    (await getMobileApi().get<NotificationSettingsDto>('/notifications/settings', { signal })).data,
  updateNotifications: async (dto: UpdateNotificationSettingsDto) =>
    (await getMobileApi().patch<NotificationSettingsDto>('/notifications/settings', dto)).data,
  unmuteAuthor: async (actorId: string) => {
    await getMobileApi().delete(`/notifications/mute-author/${encodeURIComponent(actorId)}`);
  },
};
