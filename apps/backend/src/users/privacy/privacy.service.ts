import { Inject, Injectable } from '@nestjs/common';
import {
  AutoDeletePeriod,
  ExceptionMode,
  PrivacyDimension,
  Prisma,
  UserPrivacy,
  Visibility,
} from '@prisma/client';
import { RedisService } from '../../redis/redis.service';
import {
  type DimensionExceptionsDto,
  type PrivacySettingsDto,
  type UpdatePrivacyDto,
} from '@common/contracts';
import {
  PRIVACY_REPOSITORY,
  type IPrivacyRepository,
} from './interfaces/privacy-repository.interface';

const DEFAULT_PRIVACY: Omit<PrivacySettingsDto, 'isPrivate' | 'autoDeletePeriod'> = {
  lastSeen: Visibility.EVERYBODY,
  avatar: Visibility.EVERYBODY,
  banner: Visibility.EVERYBODY,
  forwardLink: Visibility.EVERYBODY,
  calls: Visibility.EVERYBODY,
  voiceMessages: Visibility.EVERYBODY,
  messages: Visibility.EVERYBODY,
  birthday: Visibility.NOBODY,
  bio: Visibility.EVERYBODY,
  groupInvites: Visibility.EVERYBODY,
};

const VISIBILITY_KEYS = [
  'lastSeen',
  'avatar',
  'banner',
  'forwardLink',
  'calls',
  'voiceMessages',
  'messages',
  'birthday',
  'bio',
  'groupInvites',
] as const;

@Injectable()
export class PrivacyService {
  constructor(
    @Inject(PRIVACY_REPOSITORY)
    private readonly privacyRepo: IPrivacyRepository,
    private readonly redis: RedisService,
  ) {}

  async getMyPrivacy(userId: string): Promise<PrivacySettingsDto> {
    const { privacy, user } = await this.privacyRepo.getUserPrivacyAndUser(userId);

    return this.toSettingsDto(
      privacy,
      user?.isPrivate ?? false,
      user?.autoDeletePeriod ?? AutoDeletePeriod.OFF,
    );
  }

  async updateMyPrivacy(userId: string, dto: UpdatePrivacyDto): Promise<PrivacySettingsDto> {
    const privacyData: Prisma.UserPrivacyCreateInput = { user: { connect: { id: userId } } };
    const privacyUpdate: Prisma.UserPrivacyUpdateInput = {};
    for (const key of VISIBILITY_KEYS) {
      const value = dto[key];
      if (value !== undefined) {
        privacyData[key] = value;
        privacyUpdate[key] = value;
      }
    }

    const userData: Prisma.UserUpdateInput = {};
    if (dto.isPrivate !== undefined) userData.isPrivate = dto.isPrivate;
    if (dto.autoDeletePeriod !== undefined) userData.autoDeletePeriod = dto.autoDeletePeriod;

    if (dto.allowNearbyRecommendations !== undefined) {
      privacyData.allowNearbyRecommendations = dto.allowNearbyRecommendations;
      privacyUpdate.allowNearbyRecommendations = dto.allowNearbyRecommendations;
    }

    const { privacy, user } = await this.privacyRepo.upsertPrivacyAndUser(
      userId,
      privacyData,
      privacyUpdate,
      userData,
    );

    await this.redis.del(`user${userId}`);
    return this.toSettingsDto(privacy, user.isPrivate, user.autoDeletePeriod);
  }

  async listExceptions(
    userId: string,
    dimension: PrivacyDimension,
  ): Promise<DimensionExceptionsDto> {
    return this.privacyRepo.listExceptions(userId, dimension);
  }

  async addException(
    userId: string,
    dimension: PrivacyDimension,
    targetId: string,
    mode: ExceptionMode,
  ): Promise<void> {
    await this.privacyRepo.upsertException(userId, dimension, targetId, mode);
    await this.redis.del(`user${userId}`);
  }

  async removeException(
    userId: string,
    dimension: PrivacyDimension,
    targetId: string,
  ): Promise<void> {
    await this.privacyRepo.deleteException(userId, dimension, targetId);
    await this.redis.del(`user${userId}`);
  }

  private toSettingsDto(
    privacy: UserPrivacy | null,
    isPrivate: boolean,
    autoDeletePeriod: AutoDeletePeriod,
  ): PrivacySettingsDto {
    const base = privacy ?? DEFAULT_PRIVACY;
    return {
      lastSeen: base.lastSeen,
      avatar: base.avatar,
      banner: base.banner,
      forwardLink: base.forwardLink,
      calls: base.calls,
      voiceMessages: base.voiceMessages,
      messages: base.messages,
      birthday: base.birthday,
      bio: base.bio,
      groupInvites: base.groupInvites,
      isPrivate,
      autoDeletePeriod,
      allowNearbyRecommendations: privacy ? privacy.allowNearbyRecommendations : true,
    };
  }
}
