import type { AutoDeletePeriod } from '@/entities/profile/model/types';
import type {
  PrivacySettingsDto,
  PrivacyDimension as BackendPrivacyDimension,
  ExceptionMode as BackendExceptionMode,
  Visibility as BackendVisibility,
  DimensionExceptionsDto,
  PrivacyExceptionUserDto,
  SessionViewDto,
} from '@backend/common/contracts';

export type Visibility = BackendVisibility;
export type PrivacyDimension = BackendPrivacyDimension;
export type ExceptionMode = BackendExceptionMode;

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
  themeProposals: Visibility;
}

export interface PrivacySettings extends PrivacyVisibilitySettings {
  isPrivate: boolean;
  autoDeletePeriod: AutoDeletePeriod;
  allowNearbyRecommendations?: boolean;
}

export type UpdatePrivacyPayload = Partial<PrivacySettingsDto>;

export type PrivacyExceptionUser = PrivacyExceptionUserDto;
export type DimensionExceptions = DimensionExceptionsDto;

export interface SessionView extends Omit<SessionViewDto, 'createdAt' | 'lastActiveAt'> {
  createdAt: string;
  lastActiveAt: string;
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
  THEME_PROPOSALS: 'themeProposals',
};
