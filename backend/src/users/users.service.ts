import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import * as geoip from 'geoip-lite';
import { FollowStatus, NotificationType, PrivacyDimension, Prisma, User } from '@prisma/client';
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
} from '@common/contracts';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import type { IUsersRepository } from './interfaces/users-repository.interface';
import { RedisService } from '../redis/redis.service';
import { VisibilityResolver } from './privacy/visibility.resolver';
import type { VisibilityContext } from './privacy/visibility.resolver';
import { toLastSeenGranularity } from './privacy/last-seen.util';
import { PrismaService } from '@common/prisma';

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

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly redis: RedisService,
    private readonly visibility: VisibilityResolver,
    private readonly prisma: PrismaService,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
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
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          badges: true,
          _count: {
            select: {
              followers: { where: { status: 'ACCEPTED' } },
              following: { where: { status: 'ACCEPTED' } },
              posts: true,
            },
          },
        },
      });
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      const ownedBadges = user.badges.map((b) => b.badgeId);
      return this.toRawProfile(user, ownedBadges);
    });
  }

  async getProfileFor(id: string, viewerId: string | null): Promise<UserProfileDto> {
    if (viewerId && viewerId !== id) {
      const isBlocked = await this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: id },
            { blockerId: id, blockedId: viewerId },
          ],
        },
      });
      if (isBlocked) throw new NotFoundException('User not found');
    }

    const raw = await this.getRawProfile(id);
    const ctx = await this.visibility.loadContext([id], viewerId);
    const profile = this.applyPrivacy(raw, viewerId, ctx);

    if (viewerId && viewerId !== id) {
      const aliasRecord = await this.prisma.userAlias.findUnique({
        where: { ownerId_targetId: { ownerId: viewerId, targetId: id } },
      });
      if (aliasRecord) {
        profile.alias = aliasRecord.alias;
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

    await this.prisma.userAlias.upsert({
      where: { ownerId_targetId: { ownerId, targetId } },
      create: { ownerId, targetId, alias: alias.trim() },
      update: { alias: alias.trim() },
    });
    return { success: true };
  }

  async deleteUserAlias(ownerId: string, targetId: string): Promise<{ success: true }> {
    await this.prisma.userAlias.deleteMany({
      where: { ownerId, targetId },
    });
    return { success: true };
  }

  async getProfileByUsername(username: string, viewerId: string | null): Promise<UserProfileDto> {
    const clean = (username || '').replace(/^@+/, '').trim();
    if (!clean || (RESERVED_USERNAMES as readonly string[]).includes(clean.toLowerCase())) {
      throw new NotFoundException('User not found');
    }
    const user = await this.usersRepository.findByUsername(clean);
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

  async updatePrimaryBadge(userId: string, badgeId?: string | null): Promise<UserProfileDto> {
    const targetBadgeId = badgeId && badgeId.trim() !== '' ? badgeId.trim() : null;

    if (targetBadgeId !== null) {
      const ownership = await this.prisma.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId,
            badgeId: targetBadgeId,
          },
        },
      });

      if (!ownership) {
        throw new ForbiddenException(`You do not own the badge '${targetBadgeId}'`);
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { primaryBadge: targetBadgeId },
    });

    await this.redis.del(this.userKey(userId));
    return this.getProfileFor(userId, userId);
  }

  async setVerified(userId: string, isVerified: boolean): Promise<UserProfileDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const wasVerified = user.isVerified;
    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified },
    });

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
      await this.redis.del(`user${id}`);
    } catch {
      // Safe non-blocking cache invalidation
    }
    return this.getProfileFor(id, id);
  }

  async searchUsers(query: string, viewerId?: string | null): Promise<UserProfileDto[]> {
    const rawQuery = typeof query === 'string' ? query : '';
    const term = rawQuery.trim().toLowerCase().slice(0, MAX_SEARCH_TERM_LENGTH);
    if (!term) return [];

    const blockedIds = viewerId
      ? await this.prisma.userBlock
          .findMany({
            where: {
              OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
            },
            select: { blockerId: true, blockedId: true },
          })
          .then((blocks: { blockerId: string; blockedId: string }[]) => {
            const set = new Set<string>();
            for (const b of blocks) {
              if (b.blockerId === viewerId) set.add(b.blockedId);
              if (b.blockedId === viewerId) set.add(b.blockerId);
            }
            return Array.from(set);
          })
      : [];

    // Query candidates matching substring or prefix
    const candidates = await this.prisma.user.findMany({
      where: {
        AND: [
          blockedIds.length > 0 ? { id: { notIn: blockedIds } } : {},
          { username: { notIn: [...RESERVED_USERNAMES] } },
        ],
      },
      take: 60,
      include: {
        badges: true,
        _count: {
          select: {
            followers: { where: { status: 'ACCEPTED' } },
            following: { where: { status: 'ACCEPTED' } },
          },
        },
      },
    });

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

    const blockedIds = viewerId
      ? await this.prisma.userBlock
          .findMany({
            where: {
              OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
            },
            select: { blockerId: true, blockedId: true },
          })
          .then((blocks) => {
            const set = new Set<string>();
            for (const b of blocks) {
              if (b.blockerId === viewerId) set.add(b.blockedId);
              if (b.blockedId === viewerId) set.add(b.blockerId);
            }
            return Array.from(set);
          })
      : [];

    let followingIds = new Set<string>();
    let followerIds = new Set<string>();
    let recentChatIds = new Set<string>();

    if (viewerId) {
      const [following, followers, chats] = await Promise.all([
        this.prisma.follow.findMany({
          where: { followerId: viewerId, status: 'ACCEPTED' },
          select: { followingId: true },
        }),
        this.prisma.follow.findMany({
          where: { followingId: viewerId, status: 'ACCEPTED' },
          select: { followerId: true },
        }),
        this.prisma.conversationParticipant.findMany({
          where: {
            conversation: {
              participants: { some: { userId: viewerId } },
            },
            userId: { not: viewerId },
          },
          select: { userId: true },
          take: 30,
        }),
      ]);

      followingIds = new Set(following.map((f: { followingId: string }) => f.followingId));
      followerIds = new Set(followers.map((f: { followerId: string }) => f.followerId));
      recentChatIds = new Set(chats.map((c: { userId: string }) => c.userId));
    }

    const candidates = await this.prisma.user.findMany({
      where: {
        AND: [
          viewerId ? { id: { not: viewerId } } : {},
          blockedIds.length > 0 ? { id: { notIn: blockedIds } } : {},
          { username: { notIn: [...RESERVED_USERNAMES] } },
        ],
      },
      take: 60,
      include: {
        badges: true,
        _count: {
          select: {
            followers: { where: { status: 'ACCEPTED' } },
            following: { where: { status: 'ACCEPTED' } },
          },
        },
      },
    });

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
    const posts = await this.prisma.post.findMany({
      where: {
        author: { isPrivate: false },
      },
      select: { content: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const tagCounts = new Map<string, number>();
    const hashtagRegex = /#([a-zA-Z0-9_\u0400-\u04FF]+)/g;

    for (const p of posts) {
      const matches = p.content.match(hashtagRegex) || [];
      for (const m of matches) {
        const tag = m.slice(1).toLowerCase();
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
      if (viewerGeo.city) {
        await this.redis.set(`user_city:${viewerId}`, viewerGeo.city, 86400 * 30);
      }
    }

    // 2. Viewer exclusions (blocked, followed, self)
    const blockedIds = viewerId
      ? await this.prisma.userBlock
          .findMany({
            where: {
              OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
            },
            select: { blockerId: true, blockedId: true },
          })
          .then((blocks: { blockerId: string; blockedId: string }[]) => {
            const set = new Set<string>();
            for (const b of blocks) {
              if (b.blockerId === viewerId) set.add(b.blockedId);
              if (b.blockedId === viewerId) set.add(b.blockerId);
            }
            return Array.from(set);
          })
      : [];

    let followingIds: string[] = [];
    let dismissedIds: string[] = [];
    if (viewerId) {
      [followingIds, dismissedIds] = await Promise.all([
        this.prisma.follow
          .findMany({
            where: { followerId: viewerId, status: FollowStatus.ACCEPTED },
            select: { followingId: true },
          })
          .then((res: { followingId: string }[]) => res.map((r) => r.followingId)),
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
      const fof = await this.prisma.follow.findMany({
        where: {
          followerId: { in: followingIds.slice(0, 50) },
          status: FollowStatus.ACCEPTED,
          followingId: { notIn: Array.from(excludeIds) },
        },
        select: { followingId: true },
        take: 40,
      });
      pool2FofIds = fof.map((f: { followingId: string }) => f.followingId);
    }

    // Pool 3: Popular Profiles (Top 20 by follower count)
    const pool3Popular = await this.prisma.user.findMany({
      where: {
        id: { notIn: Array.from(excludeIds) },
        username: { notIn: [...RESERVED_USERNAMES] },
      },
      orderBy: { followers: { _count: 'desc' } },
      select: { id: true },
      take: 20,
    });
    const pool3PopularIds = pool3Popular.map((p: { id: string }) => p.id);

    // Merge into combined unique candidate pool (~50-80 candidates)
    const candidateIds = Array.from(
      new Set([...pool1GeoIds, ...pool2FofIds, ...pool3PopularIds]),
    ).filter((id) => !excludeIds.has(id));

    if (candidateIds.length === 0) {
      return [];
    }

    // 4. Fetch candidate user details & mutual followers in bulk
    const candidateUsers = await this.prisma.user.findMany({
      where: {
        id: { in: candidateIds },
        username: { notIn: [...RESERVED_USERNAMES] },
      },
      include: {
        badges: true,
        privacy: {
          select: { allowNearbyRecommendations: true },
        },
        _count: {
          select: {
            followers: { where: { status: FollowStatus.ACCEPTED } },
            following: { where: { status: FollowStatus.ACCEPTED } },
            posts: true,
          },
        },
        followers: {
          where: {
            followerId: { in: followingIds },
            status: FollowStatus.ACCEPTED,
          },
          select: {
            follower: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          take: 3,
        },
      },
    });

    // 5. Compute Normalized Metric Scores (each normalized to [0.0; 1.0])
    const scoredCandidates = await Promise.all(
      candidateUsers.map(async (user) => {
        // Proximity Score: Score_prox = max(0, 1 - distance_km / 100)
        let scoreProx = 0.0;
        let proxReasonText: string | null = null;
        const allowNearby = user.privacy?.allowNearbyRecommendations ?? true;

        if (viewerId && viewerGeo && allowNearby) {
          const distKm = await this.redis.geodist('user_geo', viewerId, user.id, 'km');
          if (distKm !== null && distKm <= 100) {
            scoreProx = Math.max(0, 1 - distKm / 100);
            if (distKm <= 10) {
              proxReasonText = 'Near you';
            } else {
              const candidateCity = await this.redis.get(`user_city:${user.id}`);
              proxReasonText = candidateCity ? `From your city (${candidateCity})` : 'Near you';
            }
          }
        }

        // Mutual Friends Score: Score_mut = min(1, mutual_count / 5)
        const mutualCount = user.followers.length;
        const scoreMut = Math.min(1, mutualCount / 5);

        // Popularity Score: Score_pop = min(1, log10(followers_count + 1) / 4)
        const followersCount = user._count.followers;
        const scorePop = Math.min(1, Math.log10(followersCount + 1) / 4);

        // Final Composite Score: (0.4 * prox) + (0.4 * mut) + (0.2 * pop)
        const finalScore = scoreProx * 0.4 + scoreMut * 0.4 + scorePop * 0.2;

        // Contextual Recommendation Reason matching Instagram
        let recommendationReason: {
          type: 'MUTUAL_FRIENDS' | 'NEARBY' | 'SAME_CITY' | 'POPULAR';
          text: string;
          mutualFriends?: { id: string; username: string; avatar: string | null }[];
          totalMutualCount?: number;
        };

        if (mutualCount >= 2) {
          const first = user.followers[0].follower;
          const second = user.followers[1].follower;
          const text = `Followed by ${first.username} and ${mutualCount - 1} other${
            mutualCount > 2 ? 's' : ''
          }`;
          recommendationReason = {
            type: 'MUTUAL_FRIENDS',
            text,
            mutualFriends: [first, second],
            totalMutualCount: mutualCount,
          };
        } else if (mutualCount === 1) {
          const first = user.followers[0].follower;
          recommendationReason = {
            type: 'MUTUAL_FRIENDS',
            text: `Followed by ${first.username}`,
            mutualFriends: [first],
            totalMutualCount: 1,
          };
        } else if (proxReasonText) {
          recommendationReason = {
            type: proxReasonText.startsWith('From your city') ? 'SAME_CITY' : 'NEARBY',
            text: proxReasonText,
          };
        } else {
          recommendationReason = {
            type: 'POPULAR',
            text: 'Suggested for you',
          };
        }

        return {
          user,
          finalScore,
          recommendationReason,
        };
      }),
    );

    // Sort by FinalScore descending and take limit
    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);
    const topCandidates = scoredCandidates.slice(0, limit);

    const ids = topCandidates.map((c) => c.user.id);
    const ctx = await this.visibility.loadContext(ids, viewerId ?? null);

    return topCandidates.map((c) => {
      const ownedBadges = Array.isArray(c.user.badges)
        ? c.user.badges.map((b: { badgeId: string }) => b.badgeId)
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

  private levenshtein(a: string, b: string): number {
    const str1 = (typeof a === 'string' ? a : '').slice(0, MAX_SEARCH_TERM_LENGTH);
    const str2 = (typeof b === 'string' ? b : '').slice(0, MAX_SEARCH_TERM_LENGTH);
    const m = str1.length;
    const n = str2.length;
    if (m === 0) return n;
    if (n === 0) return m;

    let prevRow: number[] = Array.from({ length: n + 1 }, (_, i) => i);
    const currRow: number[] = new Array<number>(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
      currRow[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        currRow[j] = Math.min(
          currRow[j - 1] + 1, // insertion
          prevRow[j] + 1, // deletion
          prevRow[j - 1] + cost, // substitution
        );
      }
      prevRow = [...currRow];
    }
    return prevRow[n];
  }

  async getTopFollowedUsers(limit = 5, viewerId?: string | null): Promise<UserProfileDto[]> {
    const blockedIds = viewerId
      ? await this.prisma.userBlock
          .findMany({
            where: {
              OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
            },
            select: { blockerId: true, blockedId: true },
          })
          .then((blocks: { blockerId: string; blockedId: string }[]) => {
            const set = new Set<string>();
            for (const b of blocks) {
              if (b.blockerId === viewerId) set.add(b.blockedId);
              if (b.blockedId === viewerId) set.add(b.blockerId);
            }
            return Array.from(set);
          })
      : [];

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          blockedIds.length > 0 ? { id: { notIn: blockedIds } } : {},
          { username: { notIn: [...RESERVED_USERNAMES] } },
        ],
      },
      orderBy: {
        followers: {
          _count: 'desc',
        },
      },
      take: limit,
      include: {
        badges: true,
        _count: {
          select: {
            followers: { where: { status: 'ACCEPTED' } },
            following: { where: { status: 'ACCEPTED' } },
          },
        },
      },
    });

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

    const posts = await this.prisma.post.findMany({
      where: {
        content: {
          contains: `#${cleanTag}`,
          mode: 'insensitive',
        },
      },
      select: { content: true },
      take: 100,
    });

    const tagCounts = new Map<string, number>();
    const hashtagRegex = /#([a-zA-Z0-9_\u0400-\u04FF]+)/g;

    for (const p of posts) {
      const matches = p.content.match(hashtagRegex) || [];
      for (const m of matches) {
        const tag = m.slice(1).toLowerCase();
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
