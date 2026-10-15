import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { PrismaService } from '@common/prisma';
import {
  FamilyLinkRecord,
  FamilyLinkStatus,
  FamilyActivitySummaryDto,
  FamilySettingsDto,
  PendingPairRequestDto,
  ChildSafeguards,
} from './family.types';
import { FamilySafeguardService } from './family-safeguard.service';

const MAX_CHILDREN_PER_PARENT = 8;
const MAX_PARENTS_PER_CHILD = 2;
const PAIR_CODE_TTL_SECONDS = 600; // 10 minutes
const PAIR_RATE_LIMIT_MAX = 5;
const PAIR_RATE_LIMIT_TTL = 600;

export function calculateAgeFromBirthDate(birthDate?: Date | string | null): number {
  if (!birthDate) return 24; // Default to adult if unspecified
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 24;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  // In-memory persistent state (synced to Redis / DB)
  private readonly links = new Map<string, FamilyLinkRecord>();
  private readonly inviteTokens = new Map<
    string,
    { token: string; code: string; childId: string; expiresAt: Date }
  >();
  private readonly pendingRequests = new Map<string, PendingPairRequestDto>();

  // Mock users database cache for tests & demo
  private readonly mockUsers = new Map<
    string,
    { id: string; username: string; displayName: string; avatar: string | null; birthDate: Date }
  >();

  constructor(
    @Optional() private readonly redis?: RedisService,
    @Optional()
    @Inject(forwardRef(() => MessengerGateway))
    private readonly gateway?: MessengerGateway,
    private readonly safeguardService?: FamilySafeguardService,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    this.seedDemoData();
  }

  private seedDemoData(): void {
    // Seed initial demo users with realistic age calculation
    const nowYear = new Date().getFullYear();
    this.mockUsers.set('user-adult-1', {
      id: 'user-adult-1',
      username: 'ayate_parent',
      displayName: 'Ayate (Guardian)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      birthDate: new Date(nowYear - 38, 4, 12), // 38 y.o.
    });
    this.mockUsers.set('child-1', {
      id: 'child-1',
      username: 'leo_gamer',
      displayName: 'Leo (Teen)',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      birthDate: new Date(nowYear - 14, 2, 10), // 14 y.o.
    });
    this.mockUsers.set('child-2', {
      id: 'child-2',
      username: 'mia_art',
      displayName: 'Mia (Child)',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      birthDate: new Date(nowYear - 11, 7, 22), // 11 y.o.
    });

    // Seed active family link for adult-1 and child-1
    const link1: FamilyLinkRecord = {
      id: 'link-demo-1',
      parentId: 'user-adult-1',
      childId: 'child-1',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 86400000 * 14),
      updatedAt: new Date(Date.now() - 86400000 * 14),
      confirmedAt: new Date(Date.now() - 86400000 * 14),
      parent: this.mockUsers.get('user-adult-1'),
      child: this.mockUsers.get('child-1'),
    };
    this.links.set(link1.id, link1);
  }

  registerUserForTesting(user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    birthDate: Date;
  }): void {
    this.mockUsers.set(user.id, user);
  }

  async generatePairQr(childId: string): Promise<{
    token: string;
    code: string;
    expiresAt: string;
  }> {
    const child = this.mockUsers.get(childId);
    if (child && calculateAgeFromBirthDate(child.birthDate) >= 18) {
      throw new BadRequestException(
        'Generating a teen code is only available for accounts under 18 years old.',
      );
    }

    // Check parent limit
    const existingParents = Array.from(this.links.values()).filter(
      (l) => l.childId === childId && l.status === 'ACTIVE',
    );
    if (existingParents.length >= MAX_PARENTS_PER_CHILD) {
      throw new BadRequestException(`Maximum linked parents reached (${MAX_PARENTS_PER_CHILD}).`);
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `FC-${randomSuffix}`;
    const token = `pair_tok_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + PAIR_CODE_TTL_SECONDS * 1000);

    // Save in Redis if available
    if (this.redis) {
      try {
        const client = this.redis.getClient();
        await client.set(
          `family:invite:${code}`,
          JSON.stringify({ token, childId }),
          'EX',
          PAIR_CODE_TTL_SECONDS,
        );
        await client.set(
          `family:token:${token}`,
          JSON.stringify({ code, childId }),
          'EX',
          PAIR_CODE_TTL_SECONDS,
        );
      } catch (err) {
        this.logger.warn(`Redis invite save failed: ${(err as Error).message}`);
      }
    }

    this.inviteTokens.set(code, { token, code, childId, expiresAt });
    this.inviteTokens.set(token, { token, code, childId, expiresAt });

    return {
      token,
      code,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async pair(
    parentId: string,
    rawCodeOrToken: string,
    clientIp: string = '127.0.0.1',
  ): Promise<{ linkId: string; status: FamilyLinkStatus; child: any }> {
    // 1. Anti-brute-force rate limiting: check attempt threshold
    const rateLimitKey = `rate:family:pair:${parentId || clientIp}`;
    if (this.redis) {
      try {
        const client = this.redis.getClient();
        const rawAttempts = await client.get(rateLimitKey);
        const attempts = rawAttempts ? parseInt(rawAttempts, 10) : 0;
        if (attempts >= PAIR_RATE_LIMIT_MAX) {
          throw new HttpException(
            'Too many pairing attempts. Please wait 10 minutes.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      } catch (err) {
        if (err instanceof HttpException) throw err;
        this.logger.warn(`Rate limit check failed: ${(err as Error).message}`);
      }
    }

    // 2. Age check for parent
    const parent = this.mockUsers.get(parentId);
    if (parent && calculateAgeFromBirthDate(parent.birthDate) < 18) {
      throw new ForbiddenException(
        'Parent/guardian setup is only available for accounts 18 and older.',
      );
    }

    // 3. Check parent's child limit (max 8)
    const activeChildren = Array.from(this.links.values()).filter(
      (l) => l.parentId === parentId && l.status === 'ACTIVE',
    );
    if (activeChildren.length >= MAX_CHILDREN_PER_PARENT) {
      throw new BadRequestException(
        `You have reached the maximum number of linked teens (${MAX_CHILDREN_PER_PARENT}).`,
      );
    }

    // 4. Resolve invite code/token
    const cleanKey = rawCodeOrToken.trim();
    let inviteData = this.inviteTokens.get(cleanKey);

    if (!inviteData && this.redis) {
      try {
        const raw =
          (await this.redis.getClient().get(`family:invite:${cleanKey}`)) ||
          (await this.redis.getClient().get(`family:token:${cleanKey}`));
        if (raw) {
          const parsed = JSON.parse(raw);
          inviteData = {
            token: parsed.token || cleanKey,
            code: cleanKey,
            childId: parsed.childId,
            expiresAt: new Date(Date.now() + 60000),
          };
        }
      } catch (err) {
        this.logger.warn(`Redis invite lookup failed: ${(err as Error).message}`);
      }
    }

    if (!inviteData || new Date() > inviteData.expiresAt) {
      // Increment failed brute-force attempt counter
      if (this.redis) {
        try {
          const client = this.redis.getClient();
          const attempts = await client.incr(rateLimitKey);
          if (attempts === 1) {
            await client.expire(rateLimitKey, PAIR_RATE_LIMIT_TTL);
          }
        } catch (err) {
          this.logger.warn(`Failed attempt increment error: ${(err as Error).message}`);
        }
      }
      throw new BadRequestException(
        'Invalid or expired pairing code. Please ask your teen to refresh their QR code.',
      );
    }

    const { childId } = inviteData;
    if (childId === parentId) {
      throw new BadRequestException('You cannot link your own account as a teen.');
    }

    // 5. Check child's parent limit (max 2)
    const existingChildParents = Array.from(this.links.values()).filter(
      (l) => l.childId === childId && l.status === 'ACTIVE',
    );
    if (existingChildParents.length >= MAX_PARENTS_PER_CHILD) {
      throw new BadRequestException(
        `The teen already has the maximum number of linked parents (${MAX_PARENTS_PER_CHILD}).`,
      );
    }

    // 6. Single-use: immediately invalidate token and clear rate limit counter on success
    this.inviteTokens.delete(inviteData.code);
    this.inviteTokens.delete(inviteData.token);
    if (this.redis) {
      try {
        await this.redis
          .getClient()
          .del(
            `family:invite:${inviteData.code}`,
            `family:token:${inviteData.token}`,
            rateLimitKey,
          );
      } catch (err) {
        this.logger.warn(`Token invalidation error: ${(err as Error).message}`);
      }
    }

    const linkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const childUser = this.mockUsers.get(childId) || {
      id: childId,
      username: 'teen_user',
      displayName: 'Young Member',
      avatar: null,
      birthDate: new Date(new Date().getFullYear() - 15, 0, 1),
    };

    const newLink: FamilyLinkRecord = {
      id: linkId,
      parentId,
      childId,
      status: 'PENDING_CONFIRMATION',
      createdAt: new Date(),
      updatedAt: new Date(),
      parent: parent || {
        id: parentId,
        username: 'parent_user',
        displayName: 'Guardian',
        avatar: null,
        birthDate: new Date(new Date().getFullYear() - 40, 0, 1),
      },
      child: childUser,
    };
    this.links.set(linkId, newLink);

    // 7. Store pending pair request for fallback endpoint GET /api/family/pending-invite
    const pendingPayload: PendingPairRequestDto = {
      linkId,
      parentId,
      parentUsername: newLink.parent?.username || 'Guardian',
      parentDisplayName: newLink.parent?.displayName || 'Guardian',
      parentAvatar: newLink.parent?.avatar || null,
      createdAt: newLink.createdAt.toISOString(),
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    };
    this.pendingRequests.set(childId, pendingPayload);

    // 8. Realtime transport: Push event to child's socket session
    try {
      this.gateway?.emitToUser(childId, 'family:pair_requested', pendingPayload);
      this.logger.log(`Emitted family:pair_requested to child ${childId}`);
    } catch (err) {
      this.logger.warn(`Gateway emit failed: ${(err as Error).message}`);
    }

    return {
      linkId,
      status: 'PENDING_CONFIRMATION',
      child: childUser,
    };
  }

  async confirmPair(
    childId: string,
    linkId: string,
    approved: boolean,
  ): Promise<{ success: boolean; status: FamilyLinkStatus }> {
    const link = this.links.get(linkId);
    if (!link) {
      throw new NotFoundException('Link request not found.');
    }
    if (link.childId !== childId) {
      throw new ForbiddenException('You cannot confirm a link request for another account.');
    }

    this.pendingRequests.delete(childId);

    if (approved) {
      link.status = 'ACTIVE';
      link.confirmedAt = new Date();
      link.updatedAt = new Date();
      this.links.set(linkId, link);

      // Notify parent via WebSocket
      try {
        this.gateway?.emitToUser(link.parentId, 'family:pair_confirmed', {
          linkId,
          childId,
          childUsername: link.child?.username,
          childDisplayName: link.child?.displayName,
          childAvatar: link.child?.avatar,
        });
        this.gateway?.emitToUser(childId, 'family:pair_confirmed', {
          linkId,
          parentId: link.parentId,
        });
      } catch (err) {
        this.logger.warn(`Confirmation emit error: ${(err as Error).message}`);
      }

      return { success: true, status: 'ACTIVE' };
    } else {
      link.status = 'REVOKED';
      link.updatedAt = new Date();
      this.links.set(linkId, link);

      try {
        this.gateway?.emitToUser(link.parentId, 'family:pair_declined', { linkId });
      } catch (err) {
        this.logger.warn(`Decline emit error: ${(err as Error).message}`);
      }

      return { success: false, status: 'REVOKED' };
    }
  }

  getPendingInvite(childId: string): PendingPairRequestDto | null {
    return this.pendingRequests.get(childId) || null;
  }

  getMembers(userId: string): {
    role: 'parent' | 'child';
    connectedChildren: any[];
    connectedParents: any[];
    maxChildren: number;
    maxParents: number;
  } {
    const user = this.mockUsers.get(userId);
    const age = user ? calculateAgeFromBirthDate(user.birthDate) : 25;
    const isAdult = age >= 18;

    const childrenLinks = Array.from(this.links.values()).filter(
      (l) => l.parentId === userId && l.status === 'ACTIVE',
    );
    const parentLinks = Array.from(this.links.values()).filter(
      (l) => l.childId === userId && l.status === 'ACTIVE',
    );

    const connectedChildren = childrenLinks.map((l) => {
      const child = l.child || this.mockUsers.get(l.childId);
      const childAge = calculateAgeFromBirthDate(child?.birthDate);
      const safeguards = this.safeguardService?.getSafeguards(l.childId);
      return {
        linkId: l.id,
        id: l.childId,
        username: child?.username || 'teen_user',
        displayName: child?.displayName || 'Child',
        avatar: child?.avatar || null,
        birthDate: child?.birthDate ? child.birthDate.toISOString() : null,
        age: childAge,
        status: 'online',
        connectedAt: l.createdAt.toISOString(),
        safeguards,
      };
    });

    const connectedParents = parentLinks.map((l) => {
      const parent = l.parent || this.mockUsers.get(l.parentId);
      return {
        linkId: l.id,
        id: l.parentId,
        username: parent?.username || 'parent_user',
        displayName: parent?.displayName || 'Parent',
        avatar: parent?.avatar || null,
        connectedAt: l.createdAt.toISOString(),
      };
    });

    return {
      role: isAdult ? 'parent' : 'child',
      connectedChildren,
      connectedParents,
      maxChildren: MAX_CHILDREN_PER_PARENT,
      maxParents: MAX_PARENTS_PER_CHILD,
    };
  }

  revokeFamilyLink(userId: string, linkId: string): { success: boolean; message: string } {
    const link = this.links.get(linkId);
    if (!link) {
      throw new NotFoundException('Family link not found.');
    }

    if (link.parentId !== userId && link.childId !== userId) {
      throw new ForbiddenException('You do not have permission to disconnect this family link.');
    }

    link.status = 'REVOKED';
    link.updatedAt = new Date();
    this.links.set(linkId, link);

    const otherUserId = link.parentId === userId ? link.childId : link.parentId;

    try {
      this.gateway?.emitToUser(otherUserId, 'family:member_removed', {
        linkId,
        removedByUserId: userId,
        reason: 'REVOKED_BY_MEMBER',
      });
    } catch (err) {
      this.logger.warn(`Revoke emit error: ${(err as Error).message}`);
    }

    return { success: true, message: 'Family Center link has been disconnected.' };
  }

  async getFamilySettings(userId: string): Promise<FamilySettingsDto> {
    const defaultSettings: FamilySettingsDto = {
      weeklyDigest: true,
      newFriendAlerts: true,
      reportAlerts: true,
      notifyLinkRequests: true,
      pinEnabled: false,
      pinCode: '',
    };
    if (this.redis) {
      try {
        const client = this.redis.getClient();
        const raw = await client.get(`family:settings:${userId}`);
        if (raw) {
          return { ...defaultSettings, ...JSON.parse(raw) };
        }
      } catch (err) {
        this.logger.warn(`Failed to get family settings from redis: ${(err as Error).message}`);
      }
    }
    return defaultSettings;
  }

  async updateFamilySettings(
    userId: string,
    patch: Partial<FamilySettingsDto>,
  ): Promise<FamilySettingsDto> {
    const current = await this.getFamilySettings(userId);
    const updated: FamilySettingsDto = { ...current, ...patch };
    if (this.redis) {
      try {
        const client = this.redis.getClient();
        await client.set(`family:settings:${userId}`, JSON.stringify(updated));
      } catch (err) {
        this.logger.warn(`Failed to persist family settings to redis: ${(err as Error).message}`);
      }
    }
    return updated;
  }

  async getActivitySummary(
    childId: string,
    requesterId: string,
  ): Promise<FamilyActivitySummaryDto> {
    const isChildThemself = childId === requesterId;
    const isConnectedParent = Array.from(this.links.values()).some(
      (l) => l.parentId === requesterId && l.childId === childId && l.status === 'ACTIVE',
    );

    if (!isChildThemself && !isConnectedParent) {
      throw new ForbiddenException('You do not have permission to view activity for this account.');
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let newFriendsCount = 0;
    let messagingUsersCount = 0;
    let voiceVideoMinutes = 0;
    let purchaseAmount = 0;
    let reportsSharedCount = 0;

    if (this.prisma) {
      try {
        // 1. New friends: mutual follow established within the last 7 days
        // User A follows User B and User B follows User A, both ACCEPTED.
        const myFollowings = await this.prisma.follow.findMany({
          where: { followerId: childId, status: 'ACCEPTED' },
          select: { followingId: true, createdAt: true },
        });

        const myFollowers = await this.prisma.follow.findMany({
          where: { followingId: childId, status: 'ACCEPTED' },
          select: { followerId: true, createdAt: true },
        });

        const followerMap = new Map(myFollowers.map((f) => [f.followerId, f.createdAt]));

        for (const following of myFollowings) {
          const followerCreatedAt = followerMap.get(following.followingId);
          if (followerCreatedAt) {
            const mutualEstablishedAt = Math.max(
              following.createdAt.getTime(),
              followerCreatedAt.getTime(),
            );
            if (mutualEstablishedAt >= sevenDaysAgo.getTime()) {
              newFriendsCount++;
            }
          }
        }

        // 2. Messaging users: distinct participants in conversations where messages were exchanged in the last 7 days
        const childParticipations = await this.prisma.conversationParticipant.findMany({
          where: { userId: childId },
          select: { conversationId: true },
        });
        const conversationIds = childParticipations.map((p) => p.conversationId);

        if (conversationIds.length > 0) {
          const activeConversations = await this.prisma.message.findMany({
            where: {
              conversationId: { in: conversationIds },
              createdAt: { gte: sevenDaysAgo },
            },
            select: { conversationId: true },
            distinct: ['conversationId'],
          });
          const activeConvIds = activeConversations.map((m) => m.conversationId);

          if (activeConvIds.length > 0) {
            const otherParticipants = await this.prisma.conversationParticipant.findMany({
              where: {
                conversationId: { in: activeConvIds },
                userId: { not: childId },
              },
              select: { userId: true },
              distinct: ['userId'],
            });
            messagingUsersCount = otherParticipants.length;
          }
        }

        // 3. Voice & video call minutes in the last 7 days
        const calls = await this.prisma.callParticipant.findMany({
          where: {
            userId: childId,
            call: {
              startedAt: { gte: sevenDaysAgo },
            },
          },
          select: {
            call: {
              select: {
                durationMs: true,
                startedAt: true,
                endedAt: true,
              },
            },
          },
        });

        let totalCallMs = 0;
        for (const cp of calls) {
          if (cp.call.durationMs) {
            totalCallMs += cp.call.durationMs;
          } else if (cp.call.startedAt && cp.call.endedAt) {
            totalCallMs += Math.max(0, cp.call.endedAt.getTime() - cp.call.startedAt.getTime());
          }
        }
        voiceVideoMinutes = Math.round(totalCallMs / (1000 * 60));

        // 4. Reports filed by the child in the last 7 days
        reportsSharedCount = await this.prisma.report.count({
          where: {
            reporterId: childId,
            createdAt: { gte: sevenDaysAgo },
          },
        });
      } catch (err) {
        this.logger.error(`Failed to aggregate telemetry from prisma: ${(err as Error).message}`);
      }
    }

    // 5. Purchases from safeguards (in USD)
    if (this.safeguardService) {
      try {
        const safeguards = this.safeguardService.getSafeguards(childId);
        purchaseAmount = safeguards.spentThisMonth || 0;
      } catch {
        purchaseAmount = 0;
      }
    }

    return {
      childId,
      periodDays: 7,
      newFriendsCount,
      messagingUsersCount,
      voiceVideoMinutes,
      purchaseAmount,
      giftsReceivedCount: 0,
      reportsSharedCount,
      lastUpdated: new Date().toISOString(),
    };
  }
}
