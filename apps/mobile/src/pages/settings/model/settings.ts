import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HARDENED_USERNAME_REGEX,
  RESERVED_USERNAMES,
  type ExceptionMode,
  type NotificationSettingsDto,
  type PrivacyDimension,
  type ProfileShowcaseDto,
  type UpdateShowcaseDto,
  type UpdateNotificationSettingsDto,
  type UpdatePrivacyDto,
  type UpdateUserDto,
  type UserProfileDto,
  type Visibility,
} from '@social-network/shared-contracts';
import { queryKeys } from '@social-network/shared-api-client';
import { useAuthStore, type UserSessionProfile } from '@social-network/shared-stores';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useDebounce } from '@/shared/lib/useDebounce';
import { type MessageKey, msg, tr } from '@/shared/lib/i18n';
import {
  settingsApi,
  type FamilySafeguards,
  type FamilySettings,
  type PrivacySettings,
} from '../api/settingsApi';

export const settingsKeys = {
  all: (userId: string) => ['mobile', userId, 'settings'] as const,
  me: (userId: string) => [...settingsKeys.all(userId), 'me'] as const,
  privacy: (userId: string) => [...settingsKeys.all(userId), 'privacy'] as const,
  exceptions: (userId: string, dimension: PrivacyDimension) =>
    [...settingsKeys.all(userId), 'exceptions', dimension] as const,
  sessions: (userId: string) => [...settingsKeys.all(userId), 'sessions'] as const,
  notifications: (userId: string) => [...settingsKeys.all(userId), 'notifications'] as const,
  username: (userId: string, username: string) =>
    [...settingsKeys.all(userId), 'username', username] as const,
  showcase: (userId: string) => [...settingsKeys.all(userId), 'showcase'] as const,
  family: (userId: string) => [...settingsKeys.all(userId), 'family'] as const,
  familyPart: (userId: string, part: string, id = '') =>
    [...settingsKeys.family(userId), part, id] as const,
};

export const PRIVACY_DIMENSIONS = [
  ['LAST_SEEN', 'lastSeen'],
  ['AVATAR', 'avatar'],
  ['BANNER', 'banner'],
  ['BIO', 'bio'],
  ['BIRTHDAY', 'birthday'],
  ['MESSAGES', 'messages'],
  ['CALLS', 'calls'],
  ['VOICE_MESSAGES', 'voiceMessages'],
  ['FORWARD_LINK', 'forwardLink'],
  ['GROUP_INVITES', 'groupInvites'],
  ['THEME_PROPOSALS', 'themeProposals'],
] as const satisfies readonly (readonly [PrivacyDimension, keyof PrivacySettings])[];

export type VisibilityKey = (typeof PRIVACY_DIMENSIONS)[number][1];

export function patchSessionUser(patch: Partial<UserSessionProfile>) {
  useAuthStore.setState((state) => (state.user ? { user: { ...state.user, ...patch } } : state));
}

export function profileUpdate(
  profile: Pick<UserProfileDto, 'displayName' | 'username' | 'bio'>,
  draft: { displayName: string; username: string; bio: string },
): UpdateUserDto {
  const next: UpdateUserDto = {};
  const displayName = draft.displayName.trim();
  const username = draft.username.trim().replace(/^@+/, '').toLowerCase();
  const bio = draft.bio.trim();
  if (displayName !== (profile.displayName ?? '')) next.displayName = displayName;
  if (username !== profile.username) next.username = username;
  if (bio !== (profile.bio ?? '')) next.bio = bio;
  return next;
}

export function usernameProblem(value: string) {
  const username = value.trim().replace(/^@+/, '').toLowerCase();
  if (username.length < 2) return tr('Use at least 2 characters.');
  if (username.length > 32) return tr('Use 32 characters or fewer.');
  if (!HARDENED_USERNAME_REGEX.test(username))
    return tr(
      'Use letters, numbers, dots and underscores. No dot or underscore at the start, end or twice in a row.',
    );
  if ((RESERVED_USERNAMES as readonly string[]).includes(username))
    return tr('This username is reserved.');
  return null;
}

export function useMe(userId: string) {
  return useQuery({
    queryKey: settingsKeys.me(userId),
    queryFn: ({ signal }) => settingsApi.me(signal),
    staleTime: 30_000,
  });
}

export function useUsernameAvailability(userId: string, value: string, current: string) {
  const username = useDebounce(value.trim().replace(/^@+/, '').toLowerCase(), 400);
  const check = username !== current && !usernameProblem(username);
  const query = useQuery({
    queryKey: settingsKeys.username(userId, username),
    queryFn: ({ signal }) => settingsApi.checkUsername(username, signal),
    enabled: check,
    staleTime: 30_000,
  });
  if (!check) return 'idle' as const;
  if (query.isPending) return 'checking' as const;
  if (query.isError) return 'unknown' as const;
  return query.data.isAvailable ? ('available' as const) : ('taken' as const);
}

function useProfileRefresh(userId: string) {
  const client = useQueryClient();
  return (profile?: Partial<UserProfileDto>) => {
    if (profile)
      client.setQueryData<UserProfileDto>(settingsKeys.me(userId), (current) =>
        current ? { ...current, ...profile } : current,
      );
    void client.invalidateQueries({ queryKey: ['mobile', userId, ...queryKeys.users.all] });
  };
}

export function useUpdateProfile(userId: string) {
  const refresh = useProfileRefresh(userId);
  return useMutation({
    mutationFn: (dto: UpdateUserDto) => settingsApi.updateProfile(userId, dto),
    onSuccess: (profile) => {
      patchSessionUser({ username: profile.username, displayName: profile.displayName });
      refresh(profile);
    },
  });
}

export function useProfileImage(userId: string, kind: 'avatar' | 'banner') {
  const refresh = useProfileRefresh(userId);
  return useMutation({
    mutationFn: (asset: ImagePickerAsset | null) =>
      asset
        ? kind === 'avatar'
          ? settingsApi.uploadAvatar(userId, asset)
          : settingsApi.uploadBanner(userId, asset)
        : settingsApi.removeAvatar(userId).then(() => ({ url: undefined })),
    onSuccess: (result) => {
      const url = result && 'url' in result ? (result.url ?? null) : null;
      if (kind === 'avatar') patchSessionUser({ avatarUrl: url });
      refresh(kind === 'avatar' ? { avatar: url } : {});
    },
  });
}

export function usePrivacy(userId: string) {
  return useQuery({
    queryKey: settingsKeys.privacy(userId),
    queryFn: ({ signal }) => settingsApi.privacy(signal),
    staleTime: 30_000,
  });
}

export function useUpdatePrivacy(userId: string) {
  const client = useQueryClient();
  const key = settingsKeys.privacy(userId);
  return useMutation({
    mutationFn: (dto: UpdatePrivacyDto) => settingsApi.updatePrivacy(dto),
    onMutate: async (dto) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<PrivacySettings>(key);
      if (previous) client.setQueryData<PrivacySettings>(key, { ...previous, ...dto });
      return { previous };
    },
    onError: (_error, _dto, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSuccess: (privacy) => client.setQueryData(key, privacy),
  });
}

export function useExceptions(userId: string, dimension: PrivacyDimension) {
  return useQuery({
    queryKey: settingsKeys.exceptions(userId, dimension),
    queryFn: ({ signal }) => settingsApi.exceptions(dimension, signal),
  });
}

export function useExceptionActions(userId: string, dimension: PrivacyDimension) {
  const client = useQueryClient();
  const key = settingsKeys.exceptions(userId, dimension);
  const settled = () => client.invalidateQueries({ queryKey: key });
  return {
    add: useMutation({
      mutationFn: ({ targetId, mode }: { targetId: string; mode: ExceptionMode }) =>
        settingsApi.addException(dimension, targetId, mode),
      onSettled: settled,
    }),
    remove: useMutation({
      mutationFn: (targetId: string) => settingsApi.removeException(dimension, targetId),
      onSettled: settled,
    }),
  };
}

export function useSessions(userId: string) {
  return useQuery({
    queryKey: settingsKeys.sessions(userId),
    queryFn: ({ signal }) => settingsApi.sessions(signal),
  });
}

export function useSessionActions(userId: string) {
  const client = useQueryClient();
  const settled = () => client.invalidateQueries({ queryKey: settingsKeys.sessions(userId) });
  return {
    revoke: useMutation({ mutationFn: settingsApi.revokeSession, onSettled: settled }),
    revokeOthers: useMutation({ mutationFn: settingsApi.revokeOtherSessions, onSettled: settled }),
  };
}

export function useChangePassword() {
  return useMutation({ mutationFn: settingsApi.changePassword });
}

export function useDeleteAccount(userId: string) {
  return useMutation({
    mutationFn: (password: string) => settingsApi.deleteAccount(userId, password),
  });
}

export function useDeactivateAccount(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      await settingsApi.verifyPassword(password);
      await settingsApi.updatePrivacy({ isPrivate: true });
      await settingsApi.hideShowcase('PRIVATE');
    },
    onSettled: () => client.invalidateQueries({ queryKey: settingsKeys.all(userId) }),
  });
}

export function useNotificationSettings(userId: string) {
  return useQuery({
    queryKey: settingsKeys.notifications(userId),
    queryFn: ({ signal }) => settingsApi.notifications(signal),
    staleTime: 30_000,
  });
}

export function useUpdateNotifications(userId: string) {
  const client = useQueryClient();
  const key = settingsKeys.notifications(userId);
  return useMutation({
    mutationFn: (dto: UpdateNotificationSettingsDto) => settingsApi.updateNotifications(dto),
    onMutate: async (dto) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<NotificationSettingsDto>(key);
      if (previous) client.setQueryData<NotificationSettingsDto>(key, { ...previous, ...dto });
      return { previous };
    },
    onError: (_error, _dto, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSuccess: (settings) =>
      client.setQueryData<NotificationSettingsDto>(key, (current) => ({
        ...settings,
        mutedActors: settings.mutedActors ?? current?.mutedActors,
      })),
  });
}

export function useUnmuteAuthor(userId: string) {
  const client = useQueryClient();
  const key = settingsKeys.notifications(userId);
  return useMutation({
    mutationFn: settingsApi.unmuteAuthor,
    onSuccess: (_result, actorId) =>
      client.setQueryData<NotificationSettingsDto>(key, (current) =>
        current
          ? {
              ...current,
              mutedActorIds: current.mutedActorIds.filter((id) => id !== actorId),
              mutedActors: current.mutedActors?.filter((actor) => actor.id !== actorId),
            }
          : current,
      ),
  });
}

export const VISIBILITY_LABEL: Record<Visibility, MessageKey> = {
  EVERYBODY: msg('Everyone'),
  CONTACTS: msg('My followers'),
  NOBODY: msg('Nobody'),
};

export function dndPreset(preset: 'off' | '1h' | '8h' | 'tomorrow', now = new Date()) {
  if (preset === 'off') return null;
  if (preset === 'tomorrow') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
    return next.toISOString();
  }
  return new Date(now.getTime() + (preset === '1h' ? 1 : 8) * 3600e3).toISOString();
}

export function useShowcase(userId: string, username: string) {
  return useQuery({
    queryKey: settingsKeys.showcase(userId),
    queryFn: ({ signal }) => settingsApi.showcase(username, signal),
    staleTime: 30_000,
  });
}

export function useUpdateShowcase(userId: string) {
  const client = useQueryClient();
  const key = settingsKeys.showcase(userId);
  return useMutation({
    mutationFn: (dto: UpdateShowcaseDto) => settingsApi.updateShowcase(dto),
    onMutate: async (dto) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ProfileShowcaseDto>(key);
      if (previous) client.setQueryData<ProfileShowcaseDto>(key, { ...previous, ...dto });
      return { previous };
    },
    onError: (_error, _dto, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useSetPrimaryBadge(userId: string) {
  const refresh = useProfileRefresh(userId);
  return useMutation({
    mutationFn: settingsApi.setPrimaryBadge,
    onSuccess: (_profile, badgeId) => refresh({ primaryBadge: badgeId }),
  });
}

export function useUpdateProfileStyle(userId: string) {
  const refresh = useProfileRefresh(userId);
  return useMutation({
    mutationFn: (dto: Pick<UpdateUserDto, 'profileTheme'>) =>
      settingsApi.updateProfile(userId, dto),
    onSuccess: (profile) => refresh(profile),
  });
}

export function useUnlinkIntegration(userId: string, githubLinked: boolean) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (platform: string) => settingsApi.unlinkIntegration(platform, githubLinked),
    onSettled: () => client.invalidateQueries({ queryKey: settingsKeys.all(userId) }),
  });
}

export function useFamily(userId: string) {
  const members = useQuery({
    queryKey: settingsKeys.familyPart(userId, 'members'),
    queryFn: ({ signal }) => settingsApi.family.members(signal),
  });
  const pending = useQuery({
    queryKey: settingsKeys.familyPart(userId, 'pending'),
    queryFn: ({ signal }) => settingsApi.family.pending(signal),
    enabled: members.data?.role === 'child' || members.data?.connectedChildren.length === 0,
  });
  return { members, pending };
}

export function useFamilyActivity(userId: string, childId: string | null) {
  return useQuery({
    queryKey: settingsKeys.familyPart(userId, 'activity', childId ?? 'me'),
    queryFn: ({ signal }) => settingsApi.family.activity(childId, signal),
  });
}

export function useFamilySafeguards(userId: string, childId: string) {
  return useQuery({
    queryKey: settingsKeys.familyPart(userId, 'safeguards', childId),
    queryFn: ({ signal }) => settingsApi.family.safeguards(childId, signal),
  });
}

export function useFamilySettings(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: settingsKeys.familyPart(userId, 'settings'),
    queryFn: ({ signal }) => settingsApi.family.settings(signal),
    enabled,
  });
}

export function useFamilyActions(userId: string) {
  const client = useQueryClient();
  const settled = () => client.invalidateQueries({ queryKey: settingsKeys.family(userId) });
  return {
    createCode: useMutation({ mutationFn: settingsApi.family.createCode }),
    pair: useMutation({ mutationFn: settingsApi.family.pair, onSettled: settled }),
    confirm: useMutation({
      mutationFn: ({ linkId, approved }: { linkId: string; approved: boolean }) =>
        settingsApi.family.confirm(linkId, approved),
      onSettled: settled,
    }),
    revoke: useMutation({ mutationFn: settingsApi.family.revoke, onSettled: settled }),
    updateSafeguards: useMutation({
      mutationFn: ({ childId, patch }: { childId: string; patch: Partial<FamilySafeguards> }) =>
        settingsApi.family.updateSafeguards(childId, patch),
      onSuccess: (safeguards, { childId }) =>
        client.setQueryData(settingsKeys.familyPart(userId, 'safeguards', childId), safeguards),
    }),
    updateSettings: useMutation({
      mutationFn: (patch: Partial<FamilySettings>) => settingsApi.family.updateSettings(patch),
      onSuccess: (settings) =>
        client.setQueryData(settingsKeys.familyPart(userId, 'settings'), settings),
    }),
  };
}
