import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { FollowStatus, ShowcasePrivacy, type ShowcaseMedia } from '@prisma/client';
import {
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
import {
  SHOWCASE_REPOSITORY,
  type IShowcaseRepository,
} from './interfaces/showcase-repository.interface';
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
    @Inject(SHOWCASE_REPOSITORY)
    private readonly showcaseRepo: IShowcaseRepository,
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
    const user = await this.showcaseRepo.findUserWithShowcase(targetUsername);

    if (!user) {
      throw new NotFoundException(`User @${targetUsername} not found`);
    }

    // Determine relationship
    let relationship: 'SELF' | 'FOLLOWER' | 'PUBLIC' = 'PUBLIC';
    if (viewerId) {
      if (viewerId === user.id) {
        relationship = 'SELF';
      } else {
        const followStatus = await this.showcaseRepo.getFollowStatus(viewerId, user.id);
        if (followStatus === FollowStatus.ACCEPTED) {
          relationship = 'FOLLOWER';
        }
      }
    }

    const rawShowcase = user.showcase || (await this.showcaseRepo.upsertDefaultShowcase(user.id));

    // Personal Meta
    const metaAllowed = canView(rawShowcase.privacyMeta, relationship);
    const activityAllowed = canView(rawShowcase.privacyActivity, relationship);
    const showcaseAllowed = canView(rawShowcase.privacyShowcase, relationship);
    const linksAllowed = canView(rawShowcase.privacyLinks, relationship);

    type ConnectedAccountsRecord = Record<string, unknown> & {
      _personalInfo?: PersonalInfoDto;
      twitch?: Record<string, unknown>;
      roblox?: Record<string, unknown>;
      github?: unknown;
    };

    const rawConnected = (rawShowcase.connectedAccounts as ConnectedAccountsRecord | null) || {};
    let personalInfo: PersonalInfoDto | null = metaAllowed
      ? (rawConnected._personalInfo as PersonalInfoDto) || null
      : null;

    const toggles = (personalInfo?.toggles as PersonalInfoTogglesDto) || {};
    const isZodiacEnabled = Boolean(
      (rawShowcase as { showZodiac?: boolean }).showZodiac === true || toggles.showZodiac === true,
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
        const relativeUsers = await this.showcaseRepo.findUsersByIds(relativeUserIds);
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
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Failed to refresh Twitch live status in getShowcase: ${msg}`);
      }
    }

    interface ConnectedRobloxData {
      username?: string;
      userId?: string;
      items?: Array<{ iconUrl?: string; [key: string]: unknown }>;
      places?: Array<{ iconUrl?: string; [key: string]: unknown }>;
      [key: string]: unknown;
    }

    if (
      cleanConnected.roblox &&
      typeof cleanConnected.roblox === 'object' &&
      this.integrationsService
    ) {
      const robloxData = cleanConnected.roblox as ConnectedRobloxData;
      const hasMockData =
        robloxData.items?.some((it) => it.iconUrl?.includes('unsplash')) ||
        robloxData.places?.some((p) => p.iconUrl?.includes('unsplash'));
      const robloxTarget = robloxData.username || robloxData.userId;
      if (hasMockData && robloxTarget) {
        try {
          const freshRoblox = (await this.integrationsService.fetchPlatformData(
            'roblox',
            String(robloxTarget),
          )) as ConnectedRobloxData | null;
          if (freshRoblox && !freshRoblox.items?.some((it) => it.iconUrl?.includes('unsplash'))) {
            cleanConnected.roblox = {
              ...robloxData,
              ...freshRoblox,
            };
            void this.showcaseRepo
              .updateConnectedAccounts(user.id, {
                ...rawConnected,
                roblox: cleanConnected.roblox,
              })
              .catch(() => {});
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Failed to auto-refresh Roblox data in getShowcase: ${msg}`);
        }
      }
    }

    const connectedAccounts: ConnectedAccountsDto | null = linksAllowed
      ? {
          ...cleanConnected,
          github: user.githubUsername
            ? typeof cleanConnected.github === 'object' && cleanConnected.github !== null
              ? {
                  ...(cleanConnected.github as Record<string, unknown>),
                  username: user.githubUsername,
                }
              : user.githubUsername
            : (cleanConnected.github as string | null) || null,
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
      ? (rawShowcase.mediaItems || []).map((m: ShowcaseMedia) => ({
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
      widgetOrder: (rawShowcase as { widgetOrder?: string[] }).widgetOrder || [
        'spotlight',
        'media',
        'meta',
      ],
      personalInfo,
    };
  }

  async updateShowcase(userId: string, dto: UpdateShowcaseDto): Promise<ProfileShowcaseDto> {
    const user = await this.showcaseRepo.findUserBasic(userId);

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

    await this.showcaseRepo.updateShowcase(userId, dto);

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
