import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../redis/redis.service';
import { FollowStatus } from '@prisma/client';
import {
  ShowcasePrivacy,
  ShowcaseMediaType,
  type UpdateShowcaseDto,
  type ProfileShowcaseDto,
  type ShowcaseMediaItemDto,
  type SpotlightMediaDto,
  type ProfileAnthemDto,
  type LiveActivityStatusDto,
  type ConnectedAccountsDto,
  type PersonalInfoDto,
  type PersonalInfoTogglesDto,
} from '@common/contracts';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IntegrationsService } from '../integrations/integrations.service';

function getZodiacSign(date: Date): string {
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1; // 1-12

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '♈ Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '♉ Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return '♊ Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return '♋ Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '♌ Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '♍ Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return '♎ Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return '♏ Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return '♐ Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '♑ Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '♒ Aquarius';
  return '♓ Pisces';
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = today.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  return Math.max(0, age);
}

function formatLocalTime(timezoneStr: string): string {
  try {
    const tz = timezoneStr || 'UTC';
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const formatted = timeFormatter.format(now);
    return formatted;
  } catch {
    const now = new Date();
    return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  }
}

function canView(privacy: ShowcasePrivacy, relationship: 'SELF' | 'FOLLOWER' | 'PUBLIC'): boolean {
  if (relationship === 'SELF') return true;
  if (privacy === ShowcasePrivacy.PUBLIC) return true;
  if (privacy === ShowcasePrivacy.FOLLOWERS) return relationship === 'FOLLOWER';
  return false;
}

@Injectable()
export class ShowcaseService {
  private readonly logger = new Logger(ShowcaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
    @Optional()
    @Inject(forwardRef(() => IntegrationsService))
    private readonly integrationsService?: IntegrationsService,
  ) {}

  private showcaseKey(userId: string): string {
    return `showcase:${userId}`;
  }

  async getShowcase(targetUsername: string, viewerId: string | null): Promise<ProfileShowcaseDto> {
    const user = await this.prisma.user.findUnique({
      where: { username: targetUsername.toLowerCase() },
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

    if (!user) {
      throw new NotFoundException(`User @${targetUsername} not found`);
    }

    // Determine relationship
    let relationship: 'SELF' | 'FOLLOWER' | 'PUBLIC' = 'PUBLIC';
    if (viewerId) {
      if (viewerId === user.id) {
        relationship = 'SELF';
      } else {
        const follow = await this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: user.id,
            },
          },
        });
        if (follow && follow.status === FollowStatus.ACCEPTED) {
          relationship = 'FOLLOWER';
        }
      }
    }

    const rawShowcase =
      user.showcase ||
      (await this.prisma.profileShowcase.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          privacyMeta: ShowcasePrivacy.PUBLIC,
          privacyActivity: ShowcasePrivacy.PUBLIC,
          privacyShowcase: ShowcasePrivacy.PUBLIC,
          privacyLinks: ShowcasePrivacy.PUBLIC,
          showAge: false,
          showBirthdate: false,
          showGender: false,
          showTimezone: false,
          timezone: 'UTC',
          accentColor: '#6366f1',
        },
        update: {},
        include: {
          mediaItems: {
            orderBy: [{ type: 'asc' }, { position: 'asc' }],
          },
        },
      }));

    // Personal Meta
    const metaAllowed = canView(rawShowcase.privacyMeta, relationship);
    const activityAllowed = canView(rawShowcase.privacyActivity, relationship);
    const showcaseAllowed = canView(rawShowcase.privacyShowcase, relationship);
    const linksAllowed = canView(rawShowcase.privacyLinks, relationship);

    const rawConnected = (rawShowcase.connectedAccounts as Record<string, any> | null) || {};
    let personalInfo: PersonalInfoDto | null = metaAllowed
      ? (rawConnected._personalInfo as PersonalInfoDto) || null
      : null;

    const toggles = (personalInfo?.toggles as PersonalInfoTogglesDto) || {};
    const isZodiacEnabled = Boolean(
      (rawShowcase as any).showZodiac === true || toggles.showZodiac === true,
    );

    let birthDateStr: string | null = null;
    let ageVal: number | null = null;
    let zodiacVal: string | null = null;
    let genderVal: string | null = null;
    let localTimeVal: string | null = null;

    if (metaAllowed) {
      if (user.birthDate && rawShowcase.showBirthdate === true) {
        birthDateStr = user.birthDate.toISOString().split('T')[0];
      }
      if (user.birthDate && isZodiacEnabled) {
        zodiacVal = getZodiacSign(user.birthDate);
      }
      if (user.birthDate && rawShowcase.showAge === true) {
        ageVal = calculateAge(user.birthDate);
      }
      const effectiveGender = (personalInfo?.gender as string) || user.gender || null;
      if (rawShowcase.showGender === true && effectiveGender) {
        genderVal = effectiveGender;
      }
      if (rawShowcase.showTimezone === true) {
        localTimeVal = formatLocalTime(rawShowcase.timezone || 'UTC');
      }
    }

    // Hydrate normalized family members and partner with live data from User model
    if (personalInfo) {
      const relativeUserIds: string[] = [];
      if (Array.isArray(personalInfo.familyMembers)) {
        for (const m of personalInfo.familyMembers) {
          if (m.userId) relativeUserIds.push(m.userId);
        }
      }
      if (personalInfo.partnerUserId) {
        relativeUserIds.push(personalInfo.partnerUserId);
      }

      if (relativeUserIds.length > 0) {
        const relativeUsers = await this.prisma.user.findMany({
          where: { id: { in: relativeUserIds } },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        });
        const relativeMap = new Map(relativeUsers.map((u) => [u.id, u]));

        if (personalInfo.familyMembers) {
          personalInfo.familyMembers = personalInfo.familyMembers.map((m) => {
            if (m.userId && relativeMap.has(m.userId)) {
              const u = relativeMap.get(m.userId)!;
              return {
                ...m,
                name: u.displayName || u.username,
                username: u.username,
                avatarUrl: u.avatar,
              };
            }
            return {
              ...m,
              name: m.customName || m.name || 'Family member',
              username: m.username || null,
              avatarUrl: m.avatarUrl || null,
            };
          });
        }

        if (personalInfo.partnerUserId && relativeMap.has(personalInfo.partnerUserId)) {
          const partnerUser = relativeMap.get(personalInfo.partnerUserId)!;
          personalInfo.partner = partnerUser.displayName || `@${partnerUser.username}`;
        }
      }
    }

    // Backend Privacy Filtering: Scrub any fields where user toggled visibility OFF for non-owners
    if (relationship !== 'SELF') {
      if (rawShowcase.showBirthdate !== true) {
        birthDateStr = null;
      }
      if (rawShowcase.showAge !== true) {
        ageVal = null;
      }
      if (rawShowcase.showGender !== true) {
        genderVal = null;
      }
      if (!isZodiacEnabled) {
        zodiacVal = null;
      }
      if (rawShowcase.showTimezone !== true) {
        localTimeVal = null;
      }

      if (personalInfo) {
        personalInfo = {
          ...personalInfo,
          relationshipStatus:
            toggles.showRelationship === true ? personalInfo.relationshipStatus : null,
          partner: toggles.showRelationship === true ? personalInfo.partner : null,
          partnerUserId: toggles.showRelationship === true ? personalInfo.partnerUserId : null,
          relationshipSince:
            toggles.showRelationship === true ? personalInfo.relationshipSince : null,
          livesIn: toggles.showLivesIn === true ? personalInfo.livesIn : null,
          hometown: toggles.showHometown === true ? personalInfo.hometown : null,
          workplace: toggles.showWorkplace === true ? personalInfo.workplace : null,
          workplaceRole: toggles.showWorkplace === true ? personalInfo.workplaceRole : null,
          workplaceStatus: toggles.showWorkplace === true ? personalInfo.workplaceStatus : null,
          education: toggles.showEducation === true ? personalInfo.education : null,
          educationStatus: toggles.showEducation === true ? personalInfo.educationStatus : null,
          languages: toggles.showLanguages === true ? personalInfo.languages : null,
          family: toggles.showFamily === true ? personalInfo.family : null,
          familyMembers: toggles.showFamily === true ? personalInfo.familyMembers : null,
          gender: rawShowcase.showGender === true ? personalInfo.gender : null,
        };
      }
    }

    const { _personalInfo, ...cleanConnected } = rawConnected;

    if (
      cleanConnected.twitch &&
      typeof cleanConnected.twitch === 'object' &&
      this.integrationsService
    ) {
      try {
        const liveInfo = await this.integrationsService.getTwitchLiveStatus(cleanConnected.twitch);
        if (liveInfo) {
          cleanConnected.twitch = {
            ...cleanConnected.twitch,
            ...liveInfo,
          };
        }
      } catch (e) {
        this.logger.warn(`Failed to refresh Twitch live status in getShowcase: ${e}`);
      }
    }

    if (
      cleanConnected.roblox &&
      typeof cleanConnected.roblox === 'object' &&
      this.integrationsService
    ) {
      const robloxData = cleanConnected.roblox;
      const hasMockData =
        robloxData.items?.some((it: any) => it.iconUrl?.includes('unsplash')) ||
        robloxData.places?.some((p: any) => p.iconUrl?.includes('unsplash'));
      if (hasMockData && (robloxData.username || robloxData.userId)) {
        try {
          const freshRoblox = await this.integrationsService.fetchPlatformData(
            'roblox',
            robloxData.username || robloxData.userId,
          );
          if (
            freshRoblox &&
            !freshRoblox.items?.some((it: any) => it.iconUrl?.includes('unsplash'))
          ) {
            cleanConnected.roblox = {
              ...robloxData,
              ...freshRoblox,
            };
            this.prisma.profileShowcase
              .update({
                where: { userId: user.id },
                data: {
                  connectedAccounts: {
                    ...rawConnected,
                    roblox: cleanConnected.roblox,
                  },
                },
              })
              .catch(() => {});
          }
        } catch (e) {
          this.logger.warn(`Failed to auto-refresh Roblox data in getShowcase: ${e}`);
        }
      }
    }

    const connectedAccounts: ConnectedAccountsDto | null = linksAllowed
      ? {
          ...cleanConnected,
          github: user.githubUsername
            ? typeof cleanConnected.github === 'object' && cleanConnected.github !== null
              ? { ...cleanConnected.github, username: user.githubUsername }
              : user.githubUsername
            : cleanConnected.github || null,
        }
      : null;

    const activityStatus: LiveActivityStatusDto | null = activityAllowed
      ? (rawShowcase.activityStatus as LiveActivityStatusDto | null) || null
      : null;

    const spotlightMedia: SpotlightMediaDto | null = showcaseAllowed
      ? (rawShowcase.spotlightMedia as SpotlightMediaDto | null) || null
      : null;

    const anthemTrack: ProfileAnthemDto | null = showcaseAllowed
      ? (rawShowcase.anthemTrack as ProfileAnthemDto | null) || null
      : null;

    const mediaItems: ShowcaseMediaItemDto[] = showcaseAllowed
      ? rawShowcase.mediaItems.map((m) => ({
          id: m.id,
          type: m.type,
          isWishlist: m.isWishlist ?? false,
          title: m.title,
          posterUrl: m.posterUrl,
          externalId: m.externalId,
          externalUrl: m.externalUrl,
          rating: m.rating,
          userComment: m.userComment,
          tags: m.tags || [],
          releaseYear: m.releaseYear,
          position: m.position,
        }))
      : [];

    // Check if at least 1 widget is visible and configured
    const hasPersonalInfoValues = Boolean(
      personalInfo &&
      (personalInfo.relationshipStatus ||
        personalInfo.livesIn ||
        personalInfo.hometown ||
        personalInfo.workplace ||
        personalInfo.education ||
        (Array.isArray(personalInfo.languages)
          ? personalInfo.languages.length > 0
          : personalInfo.languages) ||
        (Array.isArray(personalInfo.familyMembers)
          ? personalInfo.familyMembers.length > 0
          : personalInfo.family)),
    );
    const hasMeta =
      metaAllowed &&
      Boolean(
        birthDateStr ||
        ageVal !== null ||
        genderVal ||
        rawShowcase.pronouns ||
        localTimeVal ||
        hasPersonalInfoValues,
      );
    const hasActivity = Boolean(activityStatus);
    const hasLinks = Boolean(
      connectedAccounts && Object.values(connectedAccounts).some((v) => Boolean(v)),
    );
    const hasShowcase = Boolean(spotlightMedia || anthemTrack || mediaItems.length > 0);

    const hasVisibleWidgets = hasMeta || hasActivity || hasLinks || hasShowcase;

    return {
      id: rawShowcase.id,
      userId: user.id,
      hasVisibleWidgets: relationship === 'SELF' ? true : hasVisibleWidgets,
      relationship,
      privacyMeta: rawShowcase.privacyMeta,
      privacyActivity: rawShowcase.privacyActivity,
      privacyShowcase: rawShowcase.privacyShowcase,
      privacyLinks: rawShowcase.privacyLinks,
      accentColor: rawShowcase.accentColor || '#6366f1',
      showAge: rawShowcase.showAge,
      showBirthdate: rawShowcase.showBirthdate,
      showGender: rawShowcase.showGender,
      showTimezone: rawShowcase.showTimezone,
      showZodiac: isZodiacEnabled,
      pronouns:
        metaAllowed && (relationship === 'SELF' || toggles.showPronouns !== false)
          ? rawShowcase.pronouns
          : null,
      timezone: metaAllowed ? rawShowcase.timezone : null,
      birthDate: birthDateStr,
      age: ageVal,
      gender: genderVal,
      zodiacSign: zodiacVal,
      localTime: localTimeVal,
      connectedAccounts,
      activityStatus,
      spotlightMedia,
      anthemTrack,
      mediaItems,
      widgetOrder: Array.isArray((rawShowcase as any).widgetOrder)
        ? ((rawShowcase as any).widgetOrder as string[])
        : ['spotlight', 'media', 'meta'],
      personalInfo,
    };
  }

  async updateShowcase(userId: string, dto: UpdateShowcaseDto): Promise<ProfileShowcaseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Validate maximum 5 items per media type for Board vs Wishlist
    if (dto.mediaItems) {
      const counts: Record<string, number> = {};
      for (const item of dto.mediaItems) {
        const key = `${item.type}:${Boolean(item.isWishlist)}`;
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] > 5) {
          throw new BadRequestException(
            `Cannot add more than 5 items for ${item.isWishlist ? 'wishlist' : 'board'} category "${item.type}"`,
          );
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const existingShowcase = await tx.profileShowcase.findUnique({ where: { userId } });
      const existingConnected =
        (existingShowcase?.connectedAccounts as Record<string, any> | null) || {};
      const newConnectedAccounts =
        dto.connectedAccounts !== undefined
          ? {
              ...(dto.connectedAccounts as any),
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
        const pInfo = (newConnectedAccounts._personalInfo as Record<string, any>) || {};
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
          connectedAccounts:
            newConnectedAccounts !== undefined
              ? newConnectedAccounts
              : dto.connectedAccounts !== undefined
                ? (dto.connectedAccounts as any)
                : undefined,
          activityStatus:
            dto.activityStatus !== undefined ? (dto.activityStatus as any) : undefined,
          spotlightMedia:
            dto.spotlightMedia !== undefined ? (dto.spotlightMedia as any) : undefined,
          anthemTrack: dto.anthemTrack !== undefined ? (dto.anthemTrack as any) : undefined,
          ...(dto.widgetOrder !== undefined ? { widgetOrder: dto.widgetOrder as any } : {}),
        } as any,
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
            connectedAccounts: newConnectedAccounts,
          }),
          ...(dto.activityStatus !== undefined && { activityStatus: dto.activityStatus as any }),
          ...(dto.spotlightMedia !== undefined && { spotlightMedia: dto.spotlightMedia as any }),
          ...(dto.anthemTrack !== undefined && { anthemTrack: dto.anthemTrack as any }),
          ...(dto.widgetOrder !== undefined && { widgetOrder: dto.widgetOrder as any }),
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
                position: currentPos,
              };
            }),
          });
        }
      }

      return showcase;
    });

    await this.redis.del(this.showcaseKey(userId));

    // Real-time WebSocket emission if eventEmitter is available
    if (this.eventEmitter && dto.activityStatus !== undefined) {
      this.eventEmitter.emit('showcase.presence.updated', {
        userId,
        activityStatus: dto.activityStatus,
      });
    }

    return this.getShowcase(user.username, userId);
  }
}
