import { Injectable } from '@nestjs/common';
import {
  AutoDeletePeriod,
  ExceptionMode,
  PrivacyDimension,
  Prisma,
  UserPrivacy,
  Visibility,
} from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../../redis/redis.service';
import {
  type DimensionExceptionsDto,
  type PrivacyExceptionUserDto,
  type PrivacySettingsDto,
  type UpdatePrivacyDto,
} from '@common/contracts';

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
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getMyPrivacy(userId: string): Promise<PrivacySettingsDto> {
    const [privacy, user] = await Promise.all([
      this.prisma.userPrivacy.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { isPrivate: true, autoDeletePeriod: true },
      }),
    ]);

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

    const [privacy, user] = await this.prisma.$transaction([
      this.prisma.userPrivacy.upsert({
        where: { userId },
        create: privacyData,
        update: privacyUpdate,
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: userData,
        select: { isPrivate: true, autoDeletePeriod: true },
      }),
    ]);

    await this.redis.del(`user${userId}`);
    return this.toSettingsDto(privacy, user.isPrivate, user.autoDeletePeriod);
  }

  async listExceptions(
    userId: string,
    dimension: PrivacyDimension,
  ): Promise<DimensionExceptionsDto> {
    const rows = await this.prisma.privacyException.findMany({
      where: { ownerId: userId, dimension },
      select: {
        mode: true,
        target: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allow: PrivacyExceptionUserDto[] = [];
    const deny: PrivacyExceptionUserDto[] = [];
    for (const row of rows) {
      (row.mode === ExceptionMode.ALLOW ? allow : deny).push(row.target);
    }
    return { allow, deny };
  }

  async addException(
    userId: string,
    dimension: PrivacyDimension,
    targetId: string,
    mode: ExceptionMode,
  ): Promise<void> {
    await this.prisma.privacyException.upsert({
      where: { ownerId_dimension_targetId: { ownerId: userId, dimension, targetId } },
      create: { ownerId: userId, dimension, targetId, mode },
      update: { mode },
    });
    await this.redis.del(`user${userId}`);
  }

  async removeException(
    userId: string,
    dimension: PrivacyDimension,
    targetId: string,
  ): Promise<void> {
    await this.prisma.privacyException.deleteMany({
      where: { ownerId: userId, dimension, targetId },
    });
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
