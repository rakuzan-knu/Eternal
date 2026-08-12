import type { AutoDeletePeriod } from '@/entities/profile/model/types';

export type Visibility = 'EVERYBODY' | 'CONTACTS' | 'NOBODY';

export type PrivacyDimension =
  | 'LAST_SEEN'
  | 'AVATAR'
  | 'BANNER'
  | 'FORWARD_LINK'
  | 'CALLS'
  | 'VOICE_MESSAGES'
  | 'MESSAGES'
  | 'BIRTHDAY'
  | 'BIO'
  | 'GROUP_INVITES';

export type ExceptionMode = 'ALLOW' | 'DENY';

export interface PrivacyVisibilitySettings {
  lastSeen: Visibility;
  avatar: Visibility;
  banner: Visibility;
  forwardLink: Visibility;
  calls: Visibility;
  voiceMessages: Visibility;
  messages: Visibility;
  birthday: Visibility;
  bio: Visibility;
  groupInvites: Visibility;
}

export interface PrivacySettings extends PrivacyVisibilitySettings {
  isPrivate: boolean;
  autoDeletePeriod: AutoDeletePeriod;
}

export type UpdatePrivacyPayload = Partial<PrivacySettings>;

export interface PrivacyExceptionUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export interface DimensionExceptions {
  allow: PrivacyExceptionUser[];
  deny: PrivacyExceptionUser[];
}

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

export interface FollowRequestUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  createdAt: string;
}

export const DIMENSION_TO_KEY: Record<PrivacyDimension, keyof PrivacyVisibilitySettings> = {
  LAST_SEEN: 'lastSeen',
  AVATAR: 'avatar',
  BANNER: 'banner',
  FORWARD_LINK: 'forwardLink',
  CALLS: 'calls',
  VOICE_MESSAGES: 'voiceMessages',
  MESSAGES: 'messages',
  BIRTHDAY: 'birthday',
  BIO: 'bio',
  GROUP_INVITES: 'groupInvites',
};
