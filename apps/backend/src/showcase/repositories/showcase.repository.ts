import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { FollowStatus, ShowcasePrivacy, type Prisma } from '@prisma/client';
import type { UpdateShowcaseDto } from '@common/contracts';
import type {
  IShowcaseRepository,
  ProfileShowcaseWithMedia,
  UserWithShowcase,
} from '../interfaces/showcase-repository.interface';

@Injectable()
export class ShowcaseRepository implements IShowcaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserWithShowcase(username: string): Promise<UserWithShowcase | null> {
    return this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        displayName: true,
        birthDate: true,
        gender: true,
        githubUsername: true,
        showcase: {
          include: {
            mediaItems: {
              orderBy: [{ type: 'asc' }, { position: 'asc' }],
            },
          },
        },
      },
    });
  }

  async findUserBasic(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
  }

  async getFollowStatus(followerId: string, followingId: string): Promise<FollowStatus | null> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
      select: { status: true },
    });
    return follow ? follow.status : null;
  }

  async upsertDefaultShowcase(userId: string): Promise<ProfileShowcaseWithMedia> {
    return this.prisma.profileShowcase.upsert({
      where: { userId },
      create: {
        userId,
        privacyMeta: ShowcasePrivacy.PUBLIC,
        privacyActivity: ShowcasePrivacy.PUBLIC,
        privacyShowcase: ShowcasePrivacy.PUBLIC,
        privacyLinks: ShowcasePrivacy.PUBLIC,
        showAge: false,
        showBirthdate: true,
        showGender: true,
        showTimezone: true,
        timezone: 'UTC',
        accentColor: '#6366f1',
      },
      update: {},
      include: {
        mediaItems: true,
      },
    });
  }

  async updateShowcase(userId: string, dto: UpdateShowcaseDto): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existingShowcase = await tx.profileShowcase.findUnique({ where: { userId } });
      const existingConnected =
        (existingShowcase?.connectedAccounts as Record<string, unknown> | null) || {};
      const newConnectedAccounts: Record<string, unknown> | undefined =
        dto.connectedAccounts !== undefined
          ? {
              ...(dto.connectedAccounts || {}),
              ...(dto.personalInfo !== undefined
                ? { _personalInfo: dto.personalInfo }
                : existingConnected._personalInfo
                  ? { _personalInfo: existingConnected._personalInfo }
                  : {}),
            }
          : dto.personalInfo !== undefined || dto.showZodiac !== undefined
            ? {
                ...existingConnected,
                ...(dto.personalInfo !== undefined
                  ? { _personalInfo: dto.personalInfo }
                  : existingConnected._personalInfo
                    ? { _personalInfo: existingConnected._personalInfo }
                    : {}),
              }
            : undefined;

      if (dto.showZodiac !== undefined && newConnectedAccounts) {
        const pInfo = (newConnectedAccounts._personalInfo as Record<string, unknown>) || {};
        pInfo.toggles = {
          ...(pInfo.toggles || {}),
          showZodiac: dto.showZodiac,
        };
        newConnectedAccounts._personalInfo = pInfo;
      }

      if (dto.personalInfo?.gender !== undefined && dto.personalInfo.gender !== null) {
        await tx.user.update({
          where: { id: userId },
          data: { gender: dto.personalInfo.gender },
        });
      }

      const showcase = await tx.profileShowcase.upsert({
        where: { userId },
        create: {
          userId,
          privacyMeta: dto.privacyMeta || ShowcasePrivacy.PUBLIC,
          privacyActivity: dto.privacyActivity || ShowcasePrivacy.PUBLIC,
          privacyShowcase: dto.privacyShowcase || ShowcasePrivacy.PUBLIC,
          privacyLinks: dto.privacyLinks || ShowcasePrivacy.PUBLIC,
          showAge: dto.showAge ?? false,
          showBirthdate: dto.showBirthdate ?? true,
          showGender: dto.showGender ?? true,
          showTimezone: dto.showTimezone ?? true,
          pronouns: dto.pronouns !== undefined ? dto.pronouns : null,
          timezone: dto.timezone || 'UTC',
          accentColor: dto.accentColor || '#6366f1',
          ...(newConnectedAccounts !== undefined
            ? { connectedAccounts: newConnectedAccounts as unknown as Prisma.InputJsonValue }
            : dto.connectedAccounts !== undefined
              ? { connectedAccounts: dto.connectedAccounts as unknown as Prisma.InputJsonValue }
              : {}),
          ...(dto.activityStatus !== undefined
            ? { activityStatus: dto.activityStatus as unknown as Prisma.InputJsonValue }
            : {}),
          ...(dto.spotlightMedia !== undefined
            ? { spotlightMedia: dto.spotlightMedia as unknown as Prisma.InputJsonValue }
            : {}),
          ...(dto.anthemTrack !== undefined
            ? { anthemTrack: dto.anthemTrack as unknown as Prisma.InputJsonValue }
            : {}),
          ...(dto.widgetOrder !== undefined
            ? { widgetOrder: dto.widgetOrder as unknown as Prisma.InputJsonValue }
            : {}),
        },
        update: {
          ...(dto.privacyMeta !== undefined && { privacyMeta: dto.privacyMeta }),
          ...(dto.privacyActivity !== undefined && { privacyActivity: dto.privacyActivity }),
          ...(dto.privacyShowcase !== undefined && { privacyShowcase: dto.privacyShowcase }),
          ...(dto.privacyLinks !== undefined && { privacyLinks: dto.privacyLinks }),
          ...(dto.showAge !== undefined && { showAge: dto.showAge }),
          ...(dto.showBirthdate !== undefined && { showBirthdate: dto.showBirthdate }),
          ...(dto.showGender !== undefined && { showGender: dto.showGender }),
          ...(dto.showTimezone !== undefined && { showTimezone: dto.showTimezone }),
          ...(dto.pronouns !== undefined && { pronouns: dto.pronouns }),
          ...(dto.timezone !== undefined && { timezone: dto.timezone }),
          ...(dto.accentColor !== undefined && { accentColor: dto.accentColor }),
          ...(newConnectedAccounts !== undefined && {
            connectedAccounts: newConnectedAccounts as unknown as Prisma.InputJsonValue,
          }),
          ...(dto.activityStatus !== undefined && {
            activityStatus: dto.activityStatus as unknown as Prisma.InputJsonValue,
          }),
          ...(dto.spotlightMedia !== undefined && {
            spotlightMedia: dto.spotlightMedia as unknown as Prisma.InputJsonValue,
          }),
          ...(dto.anthemTrack !== undefined && {
            anthemTrack: dto.anthemTrack as unknown as Prisma.InputJsonValue,
          }),
          ...(dto.widgetOrder !== undefined && {
            widgetOrder: dto.widgetOrder as unknown as Prisma.InputJsonValue,
          }),
        },
      });

      if (dto.mediaItems !== undefined) {
        await tx.showcaseMedia.deleteMany({
          where: { showcaseId: showcase.id },
        });

        if (dto.mediaItems.length > 0) {
          const typePositions: Record<string, number> = {};
          await tx.showcaseMedia.createMany({
            data: dto.mediaItems.map((item) => {
              const posKey = `${item.type}:${Boolean(item.isWishlist)}`;
              const currentPos = typePositions[posKey] ?? 0;
              typePositions[posKey] = currentPos + 1;
              return {
                showcaseId: showcase.id,
                type: item.type,
                isWishlist: item.isWishlist ?? false,
                title: item.title,
                posterUrl: item.posterUrl,
                externalId: item.externalId || null,
                externalUrl: item.externalUrl || null,
                rating: item.rating ?? null,
                userComment: item.userComment || null,
                tags: item.tags || [],
                releaseYear: item.releaseYear ?? null,
                position: item.position !== undefined ? item.position : currentPos,
              };
            }),
          });
        }
      }
    });
  }

  async findUsersByIds(
    userIds: string[],
  ): Promise<
    { id: string; username: string; displayName: string | null; avatar: string | null }[]
  > {
    return this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
      },
    });
  }

  async updateConnectedAccounts(userId: string, connectedAccounts: unknown): Promise<void> {
    await this.prisma.profileShowcase.update({
      where: { userId },
      data: { connectedAccounts: connectedAccounts as Prisma.InputJsonValue },
    });
  }
}
