import type {
  AutoDeletePeriod,
  ExceptionMode,
  FollowStatus,
  PrivacyDimension,
  Prisma,
  UserPrivacy,
} from '@prisma/client';
import type { PrivacyExceptionUserDto } from '@common/contracts';

export const PRIVACY_REPOSITORY = Symbol('PRIVACY_REPOSITORY');

export interface IPrivacyRepository {
  getUserPrivacyAndUser(userId: string): Promise<{
    privacy: UserPrivacy | null;
    user: { isPrivate: boolean; autoDeletePeriod: AutoDeletePeriod } | null;
  }>;
  upsertPrivacyAndUser(
    userId: string,
    privacyData: Prisma.UserPrivacyCreateInput,
    privacyUpdate: Prisma.UserPrivacyUpdateInput,
    userData: Prisma.UserUpdateInput,
  ): Promise<{
    privacy: UserPrivacy;
    user: { isPrivate: boolean; autoDeletePeriod: AutoDeletePeriod };
  }>;
  listExceptions(
    userId: string,
    dimension: PrivacyDimension,
  ): Promise<{
    allow: PrivacyExceptionUserDto[];
    deny: PrivacyExceptionUserDto[];
  }>;
  upsertException(
    userId: string,
    dimension: PrivacyDimension,
    targetId: string,
    mode: ExceptionMode,
  ): Promise<void>;
  deleteException(userId: string, dimension: PrivacyDimension, targetId: string): Promise<void>;

  // Visibility Resolver helpers
  loadVisibilityContextData(
    ownerIds: string[],
    viewerId: string | null,
  ): Promise<{
    privacyRows: UserPrivacy[];
    exceptionRows: {
      ownerId: string;
      dimension: PrivacyDimension;
      mode: ExceptionMode;
      targetId: string;
    }[];
    followRows: { followingId: string; status: FollowStatus }[];
    blockRows: { blockerId: string; blockedId: string }[];
  }>;

  loadPresenceAudienceData(
    ownerId: string,
    uniqueViewers: string[],
  ): Promise<{
    privacyRow: UserPrivacy | null;
    exceptionRows: { mode: ExceptionMode; targetId: string }[];
    followRows: { followerId: string }[];
    blockRows: { blockerId: string; blockedId: string }[];
  }>;
}
