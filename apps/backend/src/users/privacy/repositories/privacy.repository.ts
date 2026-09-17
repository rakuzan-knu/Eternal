import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import {
  ExceptionMode,
  type FollowStatus,
  type PrivacyDimension,
  type Prisma,
  type UserPrivacy,
} from '@prisma/client';
import type { PrivacyExceptionUserDto } from '@common/contracts';
import { chunkArray } from '@common/utils/batch-stream.util';
import type { IPrivacyRepository } from '../interfaces/privacy-repository.interface';

@Injectable()
export class PrivacyRepository implements IPrivacyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPrivacyAndUser(userId: string) {
    const [privacy, user] = await Promise.all([
      this.prisma.userPrivacy.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { isPrivate: true, autoDeletePeriod: true },
      }),
    ]);
    return { privacy, user };
  }

  async upsertPrivacyAndUser(
    userId: string,
    privacyData: Prisma.UserPrivacyCreateInput,
    privacyUpdate: Prisma.UserPrivacyUpdateInput,
    userData: Prisma.UserUpdateInput,
  ) {
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
    return { privacy, user };
  }

  async listExceptions(
    userId: string,
    dimension: PrivacyDimension,
  ): Promise<{
    allow: PrivacyExceptionUserDto[];
    deny: PrivacyExceptionUserDto[];
  }> {
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

  async upsertException(
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
  }

  async deleteException(
    userId: string,
    dimension: PrivacyDimension,
    targetId: string,
  ): Promise<void> {
    await this.prisma.privacyException.deleteMany({
      where: { ownerId: userId, dimension, targetId },
    });
  }

  async loadVisibilityContextData(
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
  }> {
    const uniqueOwners = [...new Set(ownerIds)];
    const ownerBatches = chunkArray(uniqueOwners, 500);

    const privacyRows: UserPrivacy[] = [];
    const exceptionRows: {
      ownerId: string;
      dimension: PrivacyDimension;
      mode: ExceptionMode;
      targetId: string;
    }[] = [];
    const followRows: { followingId: string; status: FollowStatus }[] = [];
    const blockRows: { blockerId: string; blockedId: string }[] = [];

    for (const batch of ownerBatches) {
      const [pRows, eRows, fRows, bRows] = await Promise.all([
        this.prisma.userPrivacy.findMany({ where: { userId: { in: batch } } }),
        this.prisma.privacyException.findMany({
          where: { ownerId: { in: batch } },
          select: { ownerId: true, dimension: true, mode: true, targetId: true },
        }),
        viewerId
          ? this.prisma.follow.findMany({
              where: { followerId: viewerId, followingId: { in: batch } },
              select: { followingId: true, status: true },
            })
          : Promise.resolve([]),
        viewerId
          ? this.prisma.userBlock.findMany({
              where: {
                OR: [
                  { blockerId: viewerId, blockedId: { in: batch } },
                  { blockedId: viewerId, blockerId: { in: batch } },
                ],
              },
              select: { blockerId: true, blockedId: true },
            })
          : Promise.resolve([]),
      ]);

      privacyRows.push(...pRows);
      exceptionRows.push(...eRows);
      followRows.push(...fRows);
      blockRows.push(...bRows);
    }

    return {
      privacyRows,
      exceptionRows,
      followRows,
      blockRows,
    };
  }

  async loadPresenceAudienceData(ownerId: string, uniqueViewers: string[]) {
    const viewerBatches = chunkArray(uniqueViewers, 500);

    const [privacyRow, exceptionRows] = await Promise.all([
      this.prisma.userPrivacy.findUnique({ where: { userId: ownerId } }),
      this.prisma.privacyException.findMany({
        where: { ownerId, dimension: 'LAST_SEEN' },
        select: { mode: true, targetId: true },
      }),
    ]);

    const followRows: { followerId: string }[] = [];
    const blockRows: { blockerId: string; blockedId: string }[] = [];

    for (const batch of viewerBatches) {
      const [fRows, bRows] = await Promise.all([
        this.prisma.follow.findMany({
          where: {
            followingId: ownerId,
            followerId: { in: batch },
            status: 'ACCEPTED',
          },
          select: { followerId: true },
        }),
        this.prisma.userBlock.findMany({
          where: {
            OR: [
              { blockerId: ownerId, blockedId: { in: batch } },
              { blockedId: ownerId, blockerId: { in: batch } },
            ],
          },
          select: { blockerId: true, blockedId: true },
        }),
      ]);

      followRows.push(...fRows);
      blockRows.push(...bRows);
    }

    return {
      privacyRow,
      exceptionRows,
      followRows,
      blockRows,
    };
  }
}
