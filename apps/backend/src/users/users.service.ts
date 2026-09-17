import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import * as geoip from 'geoip-lite';
import { NotificationType, PrivacyDimension, Prisma, User } from '@prisma/client';
import {
  CreateNotificationEvent,
  NOTIFICATION_EVENTS,
} from '../notifications/events/notification.events';
import {
  CreateUserDto,
  FollowStatusView,
  RESERVED_USERNAMES,
  type UpdateUserDto,
  type UserProfileDto,
  UserFlags,
  DEFAULT_USER_FLAGS,
} from '@common/contracts';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import type { IUsersRepository } from './interfaces/users-repository.interface';
import { RedisService } from '../redis/redis.service';
import { VisibilityResolver } from './privacy/visibility.resolver';
import type { VisibilityContext } from './privacy/visibility.resolver';
import { toLastSeenGranularity } from './privacy/last-seen.util';
import { extractHashtags } from '../common/utils/safe-regex.util';
import {
  buildInterestVector,
  FEED_PRESETS,
  parsePresetName,
  rankCandidates,
  topVocabulary,
  type FeedPresetName,
  type ScoredCandidate,
  type ReasonType,
} from '@social-network/feed-score';
import { levenshtein } from '@social-network/text-pipeline';
import { TextPipelineService } from '../common/text-pipeline/text-pipeline.service';

const MAX_SEARCH_TERM_LENGTH = 64;

type RawProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  banner: string | null;
  bannerPosition: number;
  bio: string | null;
  birthDate: string | null;
  isPrivate: boolean;
  isVerified: boolean;
  flags?: number;
  primaryBadge: string | null;
  badges: string[];
  githubUsername: string | null;
  mergedPrsCount: number;
  lastSeenAt: string | null;
  autoDeletePeriod: User['autoDeletePeriod'];
  createdAt: string;
  updatedAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
};

import { LastSeenCoalescerService } from './coalescing/last-seen-coalescer.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly redis: RedisService,
    private readonly visibility: VisibilityResolver,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
    @Optional()
    private readonly lastSeenCoalescer?: LastSeenCoalescerService,
    @Optional()
    private readonly textPipeline?: TextPipelineService,
  ) {}

  private userKey(id: string): string {
    return `user:${id}`;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  create(dto: CreateUserDto): Promise<User> {
    return this.usersRepository.create(dto);
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.usersRepository.updatePassword(id, passwordHash);
    await this.redis.del(this.userKey(id));
  }

  async touchLastSeen(id: string, when: Date = new Date()): Promise<void> {
    if (this.lastSeenCoalescer) {
      this.lastSeenCoalescer.touchLastSeen(id, when);
      return;
    }
    await this.usersRepository.updateUser(id, { lastSeenAt: when });
    await this.redis.del(this.userKey(id));
  }

  async deleteAccount(id: string, password: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const matches = await argon2.verify(user.passwordHash, password);
    if (!matches) {
      throw new UnauthorizedException('Incorrect password');
    }

    await this.usersRepository.deleteUser(id);
    await this.redis.del(this.userKey(id));
  }

  private async getRawProfile(id: string): Promise<RawProfile> {
    const key = this.userKey(id);
    return this.redis.getOrSet(key, 3600, async () => {
      const user = await this.usersRepository.findFullProfile(id);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      const ownedBadges = user.badges.map((b) => b.badgeId);
      return this.toRawProfile(user, ownedBadges);
    });
  }

  async getProfileFor(id: string, viewerId: string | null): Promise<UserProfileDto> {
    if (viewerId && viewerId !== id) {
      const isBlocked = await this.usersRepository.isBlocked(viewerId, id);
      if (isBlocked) throw new NotFoundException('User not found');
    }

    const raw = await this.getRawProfile(id);
    const ctx = await this.visibility.loadContext([id], viewerId);
    const profile = this.applyPrivacy(raw, viewerId, ctx);

    if (viewerId && viewerId !== id) {
      const alias = await this.usersRepository.findUserAlias(viewerId, id);
      if (alias) {
        profile.alias = alias;
      }
    }

    return profile;
  }

  async setUserAlias(ownerId: string, targetId: string, alias: string): Promise<{ success: true }> {
    if (ownerId === targetId) {
      throw new BadRequestException('Cannot set alias for yourself');
    }
    const target = await this.usersRepository.findById(targetId);
    if (!target) throw new NotFoundException('User not found');

    await this.usersRepository.setUserAlias(ownerId, targetId, alias);
    return { success: true };
  }

  async deleteUserAlias(ownerId: string, targetId: string): Promise<{ success: true }> {
    await this.usersRepository.deleteUserAlias(ownerId, targetId);
    return { success: true };
  }

  async getProfileByUsername(username: string, viewerId: string | null): Promise<UserProfileDto> {
    const clean = (username || '').replace(/^@+/, '').trim();
    if (!clean || (RESERVED_USERNAMES as readonly string[]).includes(clean.toLowerCase())) {
      throw new NotFoundException('User not found');
    }
    let user = await this.usersRepository.findByUsername(clean);
    if (!user) {
      user = await this.usersRepository.findById(clean);
    }
    if (!user) throw new NotFoundException('User not found');
    return this.getProfileFor(user.id, viewerId);
  }

  async blockUser(blockerId: string, targetId: string): Promise<{ success: true }> {
    if (blockerId === targetId) throw new BadRequestException("Can't block yourself");
    const target = await this.usersRepository.findById(targetId);
    if (!target) throw new NotFoundException('User not found');

    await this.usersRepository.blockUser(blockerId, targetId);
    await Promise.all([
      this.redis.del(this.userKey(blockerId)),
      this.redis.del(this.userKey(targetId)),
    ]);
    return { success: true };
  }

  async unblockUser(blockerId: string, targetId: string): Promise<{ success: true }> {
    await this.usersRepository.unblockUser(blockerId, targetId);
    await Promise.all([
      this.redis.del(this.userKey(blockerId)),
      this.redis.del(this.userKey(targetId)),
    ]);
    return { success: true };
  }

  getProfile(id: string): Promise<UserProfileDto> {
    return this.getProfileFor(id, null);
  }

  async getMe(userId: string): Promise<UserProfileDto> {
    return this.getProfileFor(userId, userId);
  }

  async updatePrimaryBadge(userId: string, badgeId?: string | null): Promise<UserProfileDto> {
    return this.redis.withLock(`lock:user:badge:${userId}`, async () => {
      let targetBadgeId = badgeId && badgeId.trim() !== '' ? badgeId.trim() : null;

      if (targetBadgeId !== null) {
        if (targetBadgeId.toUpperCase() === 'CONTRIBUTOR') {
          const badgeIds = (await this.usersRepository.getUserBadges(userId)).map((b) =>
            b.toUpperCase(),
          );
          const contributorTiers = [
            'CONTRIBUTOR_OPAL',
            'CONTRIBUTOR_RUBY',
            'CONTRIBUTOR_DIAMOND',
            'CONTRIBUTOR_PLATINUM',
            'CONTRIBUTOR_GOLD',
            'CONTRIBUTOR_SILVER',
            'CONTRIBUTOR_BRONZE',
          ];
          const highestTier = contributorTiers.find((tier) => badgeIds.includes(tier));
          if (highestTier) {
            targetBadgeId = highestTier;
          }
        } else if (targetBadgeId.toUpperCase() === 'PREMIUM') {
          const badgeIds = (await this.usersRepository.getUserBadges(userId)).map((b) =>
            b.toUpperCase(),
          );
          const premiumTiers = [
            'PREMIUM_OPAL',
            'PREMIUM_RUBY',
            'PREMIUM_DIAMOND',
            'PREMIUM_PLATINUM',
            'PREMIUM_GOLD',
            'PREMIUM_SILVER',
            'PREMIUM_BRONZE',
          ];
          const highestTier = premiumTiers.find((tier) => badgeIds.includes(tier));
          if (highestTier) {
            targetBadgeId = highestTier;
          }
        }

        const hasBadge = await this.usersRepository.hasBadge(userId, targetBadgeId);
        if (!hasBadge) {
          throw new ForbiddenException(`You do not own the badge '${targetBadgeId}'`);
        }
      }

      await this.usersRepository.updateUser(userId, { primaryBadge: targetBadgeId });

      await this.redis.del(this.userKey(userId));
      return this.getProfileFor(userId, userId);
    });
  }

  async setVerified(userId: string, isVerified: boolean): Promise<UserProfileDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const wasVerified = user.isVerified;
    await this.usersRepository.updateUser(userId, { isVerified });

    if (!wasVerified && isVerified && this.eventEmitter) {
      this.eventEmitter.emit(
        NOTIFICATION_EVENTS.CREATE,
        new CreateNotificationEvent(userId, NotificationType.SYSTEM_VERIFIED, {
          text: 'Your account has been verified. A verified badge is now visible on your profile.',
        }),
      );
    }

    await this.redis.del(this.userKey(userId));
    return this.getProfileFor(userId, userId);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserProfileDto> {
    const hasFields =
      dto.email ||
      dto.username ||
      dto.displayName !== undefined ||
      dto.bio !== undefined ||
      dto.bannerPosition !== undefined;
    if (!hasFields) {
      throw new BadRequestException('At least one field must be provided');
    }

    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) throw new ConflictException('Email is already taken');
    }

    if (dto.username && dto.username !== user.username) {
      const cleanUsername = dto.username.replace(/^@+/, '').trim();
      if ((RESERVED_USERNAMES as readonly string[]).includes(cleanUsername.toLowerCase())) {
        throw new BadRequestException('This username is reserved and cannot be used.');
      }
      const cooldownKey = `username_change_cooldown:${id}`;
      const lastChange = await this.redis.get(cooldownKey);
      if (lastChange) {
        throw new BadRequestException('Username can only be changed once every 7 days.');
      }
      const existing = await this.usersRepository.findByUsername(cleanUsername);
      if (existing) throw new ConflictException('Username is already taken');
      await this.redis.set(cooldownKey, Date.now().toString(), 604800);
      dto.username = cleanUsername;
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.bannerPosition !== undefined) data.bannerPosition = dto.bannerPosition;

    await this.usersRepository.updateUser(id, data);
    try {
      await this.redis.del(this.userKey(id));
      await this.redis.del(`user:${id}`);
    } catch (e) {
      this.logger.warn(`Failed to invalidate user cache for ${id}: ${String(e)}`);
    }
    return this.getProfileFor(id, id);
  }

  async searchUsers(query: string, viewerId?: string | null): Promise<UserProfileDto[]> {
    const rawQuery = typeof query === 'string' ? query : '';
    const term = rawQuery.trim().toLowerCase().slice(0, MAX_SEARCH_TERM_LENGTH);
    if (!term) return [];

    const blockedIds = viewerId ? await this.usersRepository.getBlockedIds(viewerId) : [];

    // Query candidates matching substring or prefix
    const candidates = await this.usersRepository.searchCandidates(
      blockedIds,
      [...RESERVED_USERNAMES],
      60,
    );

    const scored = candidates
      .map((u) => {
        const uname = u.username.toLowerCase();
        const dname = (u.displayName || '').toLowerCase();

        let score = 0;
        if (uname === term) score += 500;
        else if (uname.startsWith(term)) score += 300;
        else if (uname.includes(term)) score += 200;
        else if (dname.startsWith(term)) score += 150;
        else if (dname.includes(term)) score += 100;
        else {
          // Fuzzy distance check
          const dist = this.levenshtein(uname, term);
          if (dist <= 2 && term.length >= 3) {
            score += 80 - dist * 20;
          }
        }

        score += Math.min((u._count?.followers || 0) / 1000, 50);
        return { user: u, score };
      })
      .filter((item: { score: number }) => item.score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 20)
      .map((item: { user: (typeof candidates)[0] }) => item.user);

    const ids = scored.map((u) => u.id);
    const ctx = await this.visibility.loadContext(ids, viewerId ?? null);

    return scored.map((u) => {
      const ownedBadges = (u.badges ?? []).map((b: { badgeId: string }) => b.badgeId);
      const raw = this.toRawProfile(u, ownedBadges);
      return this.applyPrivacy(raw, viewerId ?? null, ctx);
    });
  }

  async searchMentionSuggestions(
    query: string,
    viewerId?: string | null,
  ): Promise<UserProfileDto[]> {
    const rawQuery = typeof query === 'string' ? query : '';
    const term = rawQuery.trim().toLowerCase().slice(0, MAX_SEARCH_TERM_LENGTH);

    const blockedIds = viewerId ? await this.usersRepository.getBlockedIds(viewerId) : [];

    let followingIds = new Set<string>();
    let followerIds = new Set<string>();
    let recentChatIds = new Set<string>();

    if (viewerId) {
      const [following, followers, chats] = await Promise.all([
        this.usersRepository.getFollowingIds(viewerId),
        this.usersRepository.getFollowerIds(viewerId),
        this.usersRepository.getRecentChatParticipantIds(viewerId),
      ]);

      followingIds = new Set(following);
      followerIds = new Set(followers);
      recentChatIds = new Set(chats);
    }

    const candidates = await this.usersRepository.searchCandidates(
      blockedIds,
      [...RESERVED_USERNAMES],
      60,
    );

    const scored = candidates
      .map((u) => {
        const isMutual = followingIds.has(u.id) && followerIds.has(u.id);
        const isFollowing = followingIds.has(u.id);
        const isChatContact = recentChatIds.has(u.id);

        let score = 0;
        if (isMutual) score += 300;
        else if (isFollowing) score += 200;
        else if (isChatContact) score += 100;

        if (term) {
          const uname = u.username.toLowerCase();
          const dname = (u.displayName || '').toLowerCase();
          if (uname.startsWith(term)) score += 150;
          else if (uname.includes(term)) score += 80;
          else if (dname.startsWith(term)) score += 60;
          else if (dname.includes(term)) score += 30;
          else {
            const dist = this.levenshtein(uname, term);
            if (dist <= 2 && term.length >= 3) {
              score += 40 - dist * 10;
            } else if (!isMutual && !isFollowing && !isChatContact) {
              return { user: u, score: -1 };
            }
          }
        }

        return { user: u, score };
      })
      .filter((item: { score: number }) => item.score >= 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 8)
      .map((item: { user: (typeof candidates)[0] }) => item.user);

    const ids = scored.map((u) => u.id);
    const ctx = await this.visibility.loadContext(ids, viewerId ?? null);

    return scored.map((u) => {
      const ownedBadges = (u.badges ?? []).map((b: { badgeId: string }) => b.badgeId);
      const raw = this.toRawProfile(u, ownedBadges);
      return this.applyPrivacy(raw, viewerId ?? null, ctx);
    });
  }

  async getTrendingHashtags(limit = 6): Promise<{ tag: string; count: number }[]> {
    const posts = await this.usersRepository.getRecentPublicPostsContent(200);

    const tagCounts = new Map<string, number>();

    for (const p of posts) {
      const matches = this.textPipeline?.extractHashtags(p.content) ?? extractHashtags(p.content);
      for (const m of matches) {
        const tag = m.startsWith('#') ? m.slice(1).toLowerCase() : m.toLowerCase();
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getSuggestedUsers(
    viewerId?: string | null,
    limit = 5,
    clientIp?: string | null,
    headers?: Record<string, string | string[] | undefined>,
    explicitGeo?: { latitude: number; longitude: number } | null,
  ): Promise<UserProfileDto[]> {
    // 1. Resolve viewer GeoIP
    let viewerGeo: { latitude: number; longitude: number; city: string | null } | null = explicitGeo
      ? { latitude: explicitGeo.latitude, longitude: explicitGeo.longitude, city: null }
      : null;
    const rawIp =
      (typeof headers?.['cf-connecting-ip'] === 'string' && headers['cf-connecting-ip']) ||
      (typeof headers?.['x-forwarded-for'] === 'string' &&
        headers['x-forwarded-for'].split(',')[0].trim()) ||
      (typeof headers?.['x-real-ip'] === 'string' && headers['x-real-ip']) ||
      clientIp;

    if (!viewerGeo && rawIp) {
      const isLocal =
        rawIp === '127.0.0.1' ||
        rawIp === '::1' ||
        rawIp.startsWith('::ffff:127.0.0.1') ||
        rawIp.startsWith('10.') ||
        rawIp.startsWith('192.168.') ||
        rawIp === 'localhost';

      const lookup = geoip.lookup(rawIp);
      if (lookup && lookup.ll) {
        viewerGeo = {
          latitude: lookup.ll[0],
          longitude: lookup.ll[1],
          city:
            (typeof headers?.['cf-ipcity'] === 'string' ? headers['cf-ipcity'] : lookup.city) ||
            null,
        };
      } else if (isLocal || process.env.NODE_ENV !== 'production') {
        viewerGeo = {
          latitude: 50.4501,
          longitude: 30.5234,
          city: 'Kyiv',
        };
      }
    } else if (process.env.NODE_ENV !== 'production') {
      viewerGeo = {
        latitude: 50.4501,
        longitude: 30.5234,
        city: 'Kyiv',
      };
    }

    if (viewerId && viewerGeo) {
      await this.redis.geoadd('user_geo', viewerGeo.longitude, viewerGeo.latitude, viewerId);
      await this.redis.expire('user_geo', 86400 * 30);
      if (viewerGeo.city) {
        await this.redis.set(`user_city:${viewerId}`, viewerGeo.city, 86400 * 30);
      }
    }

    // 2. Viewer exclusions (blocked, followed, self)
    const blockedIds = viewerId ? await this.usersRepository.getBlockedIds(viewerId) : [];

    let followingIds: string[] = [];
    let dismissedIds: string[] = [];
    if (viewerId) {
      [followingIds, dismissedIds] = await Promise.all([
        this.usersRepository.getFollowingIds(viewerId),
        this.redis.smembers(`user:dismissed_suggestions:${viewerId}`),
      ]);
    }

    const excludeIds = new Set([
      ...blockedIds,
      ...followingIds,
      ...dismissedIds,
      ...(viewerId ? [viewerId] : []),
    ]);

    // 3. 3-Pool Candidate Selection Pipeline (Max ~100 Candidates to protect CPU & RAM)
    // Pool 1: Geolocation (Top 30 within 100km)
    let pool1GeoIds: string[] = [];
    if (viewerGeo) {
      const geoCandidates = await this.redis.geosearchMembers(
        'user_geo',
        viewerGeo.longitude,
        viewerGeo.latitude,
        100,
        30,
      );
      pool1GeoIds = geoCandidates.filter((id) => !excludeIds.has(id));
    }

    // Pool 2: Friends of Friends (Top 40 2-hop graph)
    let pool2FofIds: string[] = [];
    if (followingIds.length > 0) {
      pool2FofIds = await this.usersRepository.getFriendsOfFriends(
        followingIds,
        Array.from(excludeIds),
      );
    }

    // Pool 3: Popular Profiles (Top 20 by follower count)
    const pool3PopularIds = await this.usersRepository.getPopularUserIds(Array.from(excludeIds), [
      ...RESERVED_USERNAMES,
    ]);

    // Merge into combined unique candidate pool (~50-80 candidates)
    const candidateIds = Array.from(
      new Set([...pool1GeoIds, ...pool2FofIds, ...pool3PopularIds]),
    ).filter((id) => !excludeIds.has(id));

    if (candidateIds.length === 0) {
      return [];
    }

    // 4. Fetch candidate user details & mutual followers in bulk
    const candidateUsers = await this.usersRepository.getCandidateUsersDetails(
      candidateIds,
      [...RESERVED_USERNAMES],
      followingIds,
    );

    // 5. Preload candidate cities & geodistances in TWO roundtrips total
    // (was: up to 2xN). Privacy-gated members resolve to null without IO.
    const [candidateCities, candidateDistances] = await Promise.all([
      this.redis.mget(candidateUsers.map((u) => `user_city:${u.id}`)),
      viewerId && viewerGeo
        ? (async (): Promise<Array<number | null>> => {
            const gatedIds: string[] = [];
            const gatedIdx: number[] = [];
            candidateUsers.forEach((u, i) => {
              if (u.privacy?.allowNearbyRecommendations ?? true) {
                gatedIds.push(u.id);
                gatedIdx.push(i);
              }
            });
            const fetched = await this.redis.geodistMany('user_geo', viewerId, gatedIds, 'km');
            const distances: Array<number | null> = candidateUsers.map(() => null);
            gatedIdx.forEach((orig, k) => {
              distances[orig] = fetched[k];
            });
            return distances;
          })()
        : Promise.resolve(candidateUsers.map(() => null)),
    ]);

    // 6. Score via @social-network/feed-score. Preset from FEED_PRESET
    // ('legacy' default = bit-identical legacy composite; 'balanced' adds
    // recency + affinity). lastSeenAt always maps (neutral under legacy).
    const preset = this.feedPreset();
    const interestCtx =
      preset === 'balanced' ? await this.loadInterestContext(viewerId, candidateIds) : null;
    const ranked = rankCandidates(
      candidateUsers.map((user, idx) => ({
        id: user.id,
        distKm: candidateDistances[idx],
        allowNearby: user.privacy?.allowNearbyRecommendations ?? true,
        city: candidateCities[idx],
        mutuals: user.followers.map((f) => ({
          id: f.follower.id,
          username: f.follower.username,
          avatar: f.follower.avatar,
        })),
        mutualCount: user.followers.length,
        followersCount: user._count.followers,
        lastActiveAtMs: user.lastSeenAt ? user.lastSeenAt.getTime() : null,
        interests: interestCtx?.vectors.get(user.id) ?? null,
      })),
      {
        weights: FEED_PRESETS[preset],
        viewerInterests: interestCtx?.viewer ?? null,
      },
    );
    const usersById = new Map(candidateUsers.map((user) => [user.id, user] as const));
    type CandidateUser = (typeof candidateUsers)[number];
    interface TopCandidate {
      user: CandidateUser;
      finalScore: number;
      recommendationReason: {
        type: ReasonType;
        text: string;
        mutualFriends?: Array<{ id: string; username: string; avatar: string | null }>;
        totalMutualCount?: number;
      };
    }

    const topCandidates: TopCandidate[] = ranked.slice(0, limit).map((c: ScoredCandidate) => {
      const user = usersById.get(c.id);
      // Invariant: ranked ids always come from candidateUsers above.
      if (!user) throw new Error(`feed-score returned unknown candidate ${c.id}`);
      // Copy into the mutable DTO shape (core reasons are readonly).
      const reason = c.reason;
      return {
        user,
        finalScore: c.score,
        recommendationReason: {
          type: reason.type,
          text: reason.text,
          ...(reason.mutualFriends !== undefined
            ? { mutualFriends: reason.mutualFriends.map((m) => ({ ...m })) }
            : {}),
          ...(reason.totalMutualCount !== undefined
            ? { totalMutualCount: reason.totalMutualCount }
            : {}),
        },
      };
    });

    const ids = topCandidates.map((c) => c.user.id);
    const ctx = await this.visibility.loadContext(ids, viewerId ?? null);

    return topCandidates.map((c) => {
      const ownedBadges = Array.isArray(c.user.badges)
        ? (c.user.badges as Array<{ badgeId: string }>).map((b) => b.badgeId)
        : [];
      const raw = this.toRawProfile(c.user, ownedBadges);
      const dto = this.applyPrivacy(raw, viewerId ?? null, ctx);
      dto.recommendationReason = c.recommendationReason;
      return dto;
    });
  }

  async dismissSuggestedUser(viewerId: string, targetId: string): Promise<void> {
    await this.redis.dismissSuggestedUser(viewerId, targetId);
  }

  /**
   * Scoring preset from FEED_PRESET ('legacy' default, 'balanced' for the
   * recency+affinity A/B). Unknown values fall back to legacy with a warning.
   */
  private feedPreset(): FeedPresetName {
    const raw = process.env.FEED_PRESET;
    const preset = parsePresetName(raw);
    if (
      raw !== undefined &&
      raw.trim() !== '' &&
      preset === 'legacy' &&
      raw.trim().toLowerCase() !== 'legacy'
    ) {
      this.logger.warn(`Unknown FEED_PRESET=${JSON.stringify(raw)}, using legacy`);
    }
    return preset;
  }

  private interestVocabCache: { vocab: string[]; expiresAt: number } | null = null;

  /** Global interest vocabulary (top-32 trending tags), cached 5 minutes. */
  private async getInterestVocabulary(dim: number): Promise<string[]> {
    const now = Date.now();
    const cached = this.interestVocabCache;
    if (cached && cached.expiresAt > now && cached.vocab.length >= dim) {
      return cached.vocab.slice(0, dim);
    }
    const trending = await this.getTrendingHashtags(Math.max(dim, 32));
    const vocab = topVocabulary(
      trending.map((t) => [t.tag, t.count] as const),
      dim,
    );
    this.interestVocabCache = { vocab, expiresAt: now + 5 * 60 * 1000 };
    return vocab;
  }

  /**
   * Viewer + candidate interest vectors in ONE contents query. Returns null
   * (affinity dormant) when no vocabulary exists or on any failure — scoring
   * must never break suggestions.
   */
  private async loadInterestContext(
    viewerId: string | null | undefined,
    candidateIds: string[],
  ): Promise<{ viewer: number[] | undefined; vectors: Map<string, number[]> } | null> {
    try {
      const vocab = await this.getInterestVocabulary(32);
      if (vocab.length === 0) return null;
      const ids = viewerId ? [viewerId, ...candidateIds] : [...candidateIds];
      const rows = await this.usersRepository.getRecentContentsByAuthors(ids, 5);
      const byAuthor = new Map<string, string[]>();
      for (const row of rows) {
        const list = byAuthor.get(row.authorId) ?? [];
        list.push(row.content);
        byAuthor.set(row.authorId, list);
      }
      const vectors = new Map<string, number[]>();
      for (const [author, contents] of byAuthor) {
        vectors.set(author, buildInterestVector(contents, vocab));
      }
      return { viewer: viewerId ? vectors.get(viewerId) : undefined, vectors };
    } catch (e) {
      this.logger.warn(`Interest vectors unavailable, affinity dormant: ${String(e)}`);
      return null;
    }
  }

  private levenshtein(a: string, b: string): number {
    // Bounded core: exact whenever callers care (dist <= 2), early-exits
    // otherwise. Same decisions as the former full-matrix version at a
    // fraction of the cost (no per-row spread allocations).
    return levenshtein(a, b, 2);
  }

  async getTopFollowedUsers(limit = 5, viewerId?: string | null): Promise<UserProfileDto[]> {
    const blockedIds = viewerId ? await this.usersRepository.getBlockedIds(viewerId) : [];

    const users = await this.usersRepository.searchCandidates(
      blockedIds,
      [...RESERVED_USERNAMES],
      limit,
    );

    const ids = users.map((u) => u.id);
    const ctx = await this.visibility.loadContext(ids, viewerId ?? null);

    return users.map((u) => {
      const ownedBadges = (u.badges ?? []).map((b: { badgeId: string }) => b.badgeId);
      const raw = this.toRawProfile(u, ownedBadges);
      return this.applyPrivacy(raw, viewerId ?? null, ctx);
    });
  }

  async searchHashtags(query: string): Promise<{ tag: string; count: number }[]> {
    const cleanTag = (query || '').replace(/^#+/, '').trim().toLowerCase();
    if (!cleanTag) return [];

    const posts = await this.usersRepository.getRecentPublicPostsContent(100);

    const tagCounts = new Map<string, number>();

    for (const p of posts) {
      const matches = this.textPipeline?.extractHashtags(p.content) ?? extractHashtags(p.content);
      for (const m of matches) {
        const tag = m.startsWith('#') ? m.slice(1).toLowerCase() : m.toLowerCase();
        if (tag.includes(cleanTag)) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private toRawProfile(
    user: User & {
      _count?: { followers?: number; following?: number; posts?: number };
    },
    badges: string[] = [],
  ): RawProfile {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      banner: user.banner,
      bannerPosition: user.bannerPosition,
      bio: user.bio,
      birthDate: user.birthDate ? user.birthDate.toISOString() : null,
      isPrivate: user.isPrivate,
      isVerified: user.isVerified ?? false,
      flags:
        (user as unknown as { flags?: number }).flags !== undefined &&
        (user as unknown as { flags?: number }).flags !== 0
          ? (user as unknown as { flags: number }).flags
          : user.isVerified
            ? DEFAULT_USER_FLAGS | UserFlags.IS_VERIFIED
            : DEFAULT_USER_FLAGS,
      primaryBadge: user.primaryBadge ?? null,
      badges,
      githubUsername: user.githubUsername ?? null,
      mergedPrsCount: user.mergedPrsCount ?? 0,
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
      autoDeletePeriod: user.autoDeletePeriod,
      createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
      followersCount: user._count?.followers ?? 0,
      followingCount: user._count?.following ?? 0,
      postsCount: user._count?.posts ?? 0,
    };
  }

  private followStatusView(ownerId: string, ctx: VisibilityContext): FollowStatusView {
    if (ctx.acceptedFollowing.has(ownerId)) return FollowStatusView.FOLLOWING;
    if (ctx.pendingFollowing.has(ownerId)) return FollowStatusView.PENDING;
    return FollowStatusView.NONE;
  }

  applyPrivacy(
    raw: RawProfile,
    viewerId: string | null,
    ctx: VisibilityContext,
    now: number = Date.now(),
  ): UserProfileDto {
    const isOwner = viewerId === raw.id;
    const isFollower = this.visibility.isFollower(raw.id, ctx);

    const base: UserProfileDto = {
      id: raw.id,
      username: raw.username,
      displayName: raw.displayName,
      avatar: raw.avatar,
      bio: null,
      isPrivate: raw.isPrivate,
      isVerified: raw.isVerified ?? false,
      flags: raw.flags ?? DEFAULT_USER_FLAGS,
      primaryBadge: raw.primaryBadge ?? null,
      badges: raw.badges ?? [],
      githubUsername: raw.githubUsername ?? null,
      mergedPrsCount: raw.mergedPrsCount ?? 0,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
      followersCount: raw.followersCount ?? 0,
      followingCount: raw.followingCount ?? 0,
      postsCount: raw.postsCount ?? 0,
      isFollowing: viewerId ? ctx.acceptedFollowing.has(raw.id) : false,
    };

    if (!isOwner) {
      base.followStatus = this.followStatusView(raw.id, ctx);
    }

    if (raw.isPrivate && !isOwner && !isFollower) {
      return { ...base, avatar: raw.avatar };
    }

    if (isOwner || this.visibility.resolve(PrivacyDimension.AVATAR, raw.id, ctx)) {
      base.avatar = raw.avatar;
    } else {
      base.avatar = null;
    }

    if (isOwner || this.visibility.resolve(PrivacyDimension.BANNER, raw.id, ctx)) {
      base.banner = raw.banner;
      base.bannerPosition = raw.bannerPosition;
    }

    if (isOwner || this.visibility.resolve(PrivacyDimension.BIO, raw.id, ctx)) {
      base.bio = raw.bio;
    }

    if (isOwner || this.visibility.resolve(PrivacyDimension.BIRTHDAY, raw.id, ctx)) {
      base.birthDate = raw.birthDate;
    }

    if (raw.lastSeenAt) {
      const parsed = new Date(raw.lastSeenAt);
      const isOnline = now - parsed.getTime() < 5 * 60 * 1000;
      if (isOwner || this.visibility.resolve(PrivacyDimension.LAST_SEEN, raw.id, ctx)) {
        base.lastSeen = parsed.toISOString();
        base.lastSeenAt = parsed.toISOString();
        base.isOnline = isOnline;
      } else {
        const gran = toLastSeenGranularity(parsed, now);
        base.lastSeen = gran;
        base.lastSeenAt = gran;
        base.isOnline = false;
      }
    }

    return base;
  }
}
