import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { runsBackground } from '../config/service-role';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { PrismaService } from '@common/prisma';
import { completedYears } from '../common/utils/age.util';
import {
  FamilyLinkStatus,
  FamilyActivitySummaryDto,
  FamilySettingsDto,
  PendingPairRequestDto,
} from './family.types';
import { FamilySafeguardService } from './family-safeguard.service';
import {
  familyUserSelect,
  familyMembersInclude,
  hasActiveFamily,
  isCurrentMinor,
  lockFamilyUsers,
} from './family.persistence';

const MAX_CHILDREN_PER_PARENT = 8,
  MAX_PARENTS_PER_CHILD = 2,
  PAIR_TTL_MS = 600_000;
const hashInvite = (value: string) => createHash('sha256').update(value).digest('hex');
export function calculateAgeFromBirthDate(birthDate?: Date | string | null): number {
  if (!birthDate) return 24;
  const age = completedYears(new Date(birthDate));
  return age ?? 24;
}

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly safeguardService: FamilySafeguardService,
    @Optional()
    @Inject(forwardRef(() => MessengerGateway))
    private readonly gateway?: MessengerGateway,
  ) {}

  onModuleInit(): void {
    if (runsBackground('core')) {
      this.logger.log(
        `Family enrollment enabled: ${process.env.FAMILY_ENROLLMENT_ENABLED !== 'false'}`,
      );
    }
  }

  private assertEnrollmentOpen(): void {
    if (process.env.FAMILY_ENROLLMENT_ENABLED === 'false') {
      throw new ServiceUnavailableException(
        'Family connections are temporarily unavailable during an update. Existing connections and data rights remain accessible.',
      );
    }
  }

  @Cron('35 * * * *')
  async cleanupExpiredState(): Promise<void> {
    if (!runsBackground('core')) return;
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.familyInvite.deleteMany({
        where: { OR: [{ expiresAt: { lte: now } }, { consumedAt: { not: null } }] },
      }),
      this.prisma.familyLink.deleteMany({
        where: { status: { not: 'ACTIVE' }, expiresAt: { lte: now } },
      }),
      this.prisma.familyPairAttempts.deleteMany({
        where: { windowStart: { lte: new Date(now.getTime() - PAIR_TTL_MS) } },
      }),
      this.prisma.familyScreenUsage.deleteMany({
        where: { utcDate: { lt: new Date(now.getTime() - 86400_000).toISOString().slice(0, 10) } },
      }),
    ]);
    const adultCutoff = new Date(
      Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate() + 1),
    );
    const agedOut = await this.prisma.familyLink.findMany({
      where: {
        status: 'ACTIVE',
        child: { OR: [{ birthDate: null }, { birthDate: { lt: adultCutoff } }] },
      },
      select: { childId: true, parentId: true },
      take: 100,
    });
    for (const link of agedOut) {
      await this.prisma.$transaction(async (tx) => {
        await lockFamilyUsers(tx, [link.childId, link.parentId]);
        const child = await tx.user.findUnique({
          where: { id: link.childId },
          select: { birthDate: true },
        });
        if (isCurrentMinor(child?.birthDate)) return;
        await tx.familyLink.deleteMany({ where: { childId: link.childId } });
        await tx.familySafeguard.deleteMany({ where: { childId: link.childId } });
        await tx.familyInvite.deleteMany({ where: { childId: link.childId } });
        await tx.familyScreenUsage.deleteMany({ where: { userId: link.childId } });
      });
    }
  }

  private async assertEligible(tx: Prisma.TransactionClient, parentId: string, childId: string) {
    const [parent, child] = await Promise.all([
      tx.user.findUnique({ where: { id: parentId }, select: familyUserSelect }),
      tx.user.findUnique({ where: { id: childId }, select: familyUserSelect }),
    ]);
    const age = parent?.birthDate ? completedYears(parent.birthDate) : null;
    if (!parent || age === null || age < 18)
      throw new ForbiddenException(
        'Parent/guardian setup is only available for accounts 18 and older.',
      );
    if (!child || !isCurrentMinor(child.birthDate) || childId === parentId)
      throw new BadRequestException('This account is not eligible for teen pairing.');
    const [children, parents, existing] = await Promise.all([
      tx.familyLink.findMany({
        where: { parentId, status: 'ACTIVE' },
        include: { child: { select: { birthDate: true } } },
      }),
      tx.familyLink.count({ where: { childId, status: 'ACTIVE' } }),
      tx.familyLink.count({ where: { parentId, childId, status: 'ACTIVE' } }),
    ]);
    if (
      children.filter((link) => isCurrentMinor(link.child.birthDate)).length >=
      MAX_CHILDREN_PER_PARENT
    )
      throw new BadRequestException('You have reached the maximum number of linked teens (8).');
    if (parents >= MAX_PARENTS_PER_CHILD)
      throw new BadRequestException(
        'The teen already has the maximum number of linked parents (2).',
      );
    if (existing) throw new BadRequestException('These accounts are already linked.');
    return { parent, child };
  }

  async generatePairQr(childId: string) {
    this.assertEnrollmentOpen();
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = `FC-${randomInt(1000, 10000)}`,
        token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + PAIR_TTL_MS);
      try {
        await this.prisma.$transaction(async (tx) => {
          await lockFamilyUsers(tx, [childId]);
          const child = await tx.user.findUnique({
            where: { id: childId },
            select: { birthDate: true },
          });
          if (!isCurrentMinor(child?.birthDate))
            throw new BadRequestException(
              'Generating a teen code is only available for accounts under 18 years old.',
            );
          if (
            (await tx.familyLink.count({ where: { childId, status: 'ACTIVE' } })) >=
            MAX_PARENTS_PER_CHILD
          )
            throw new BadRequestException('Maximum linked parents reached (2).');
          await tx.familyInvite.deleteMany({
            where: { OR: [{ childId }, { expiresAt: { lte: new Date() } }] },
          });
          await tx.familyInvite.create({
            data: { childId, codeHash: hashInvite(code), tokenHash: hashInvite(token), expiresAt },
          });
        });
        return { code, token, expiresAt: expiresAt.toISOString() };
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
          throw error;
      }
    }
    throw new BadRequestException('Please retry generating a pairing code.');
  }

  async pair(
    parentId: string,
    rawCodeOrToken: string,
    _clientIp = '127.0.0.1',
  ): Promise<{ linkId: string; status: FamilyLinkStatus }> {
    this.assertEnrollmentOpen();
    if (typeof rawCodeOrToken !== 'string' || !rawCodeOrToken.trim() || rawCodeOrToken.length > 256)
      throw new BadRequestException('A pairing code is required.');
    const digest = hashInvite(rawCodeOrToken.trim());
    // Resolve only the child ID before locking; consumption and eligibility are checked again under locks.
    const lookup = await this.prisma.familyInvite.findFirst({
      where: { OR: [{ codeHash: digest }, { tokenHash: digest }] },
      select: { childId: true },
    });
    const outcome = await this.prisma.$transaction(async (tx) => {
      await lockFamilyUsers(tx, lookup ? [parentId, lookup.childId] : [parentId]);
      const parent = await tx.user.findUnique({
        where: { id: parentId },
        select: { birthDate: true },
      });
      const age = parent?.birthDate ? completedYears(parent.birthDate) : null;
      if (age === null || age < 18)
        throw new ForbiddenException(
          'Parent/guardian setup is only available for accounts 18 and older.',
        );
      const now = new Date();
      const previous = await tx.familyPairAttempts.findUnique({ where: { userId: parentId } });
      const attempts =
        previous && now.getTime() - previous.windowStart.getTime() < PAIR_TTL_MS
          ? previous.attempts
          : 0;
      if (attempts >= 5) return { limited: true };
      const invite = await tx.familyInvite.findFirst({
        where: {
          OR: [{ codeHash: digest }, { tokenHash: digest }],
          consumedAt: null,
          expiresAt: { gt: now },
        },
      });
      if (!invite || invite.childId !== lookup?.childId) {
        await tx.familyPairAttempts.upsert({
          where: { userId: parentId },
          create: { userId: parentId, attempts: 1, windowStart: now },
          update: { attempts: attempts + 1, ...(attempts === 0 ? { windowStart: now } : {}) },
        });
        return { invalid: true };
      }
      const { parent: actor } = await this.assertEligible(tx, parentId, invite.childId);
      const consumed = await tx.familyInvite.updateMany({
        where: { id: invite.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return { invalid: true };
      await tx.familyPairAttempts.deleteMany({ where: { userId: parentId } });
      // Replace stale pending prompts for this pair while preserving independent guardian requests.
      await tx.familyLink.updateMany({
        where: { parentId, childId: invite.childId, status: 'PENDING_CONFIRMATION' },
        data: { status: 'REVOKED', expiresAt: now },
      });
      const link = await tx.familyLink.create({
        data: {
          parentId,
          childId: invite.childId,
          expiresAt: new Date(now.getTime() + PAIR_TTL_MS),
        },
      });
      return { link, actor };
    });
    if ('limited' in outcome)
      throw new HttpException(
        'Too many pairing attempts. Please wait 10 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    if (!outcome.link || !outcome.actor)
      throw new BadRequestException(
        'Invalid or expired pairing code. Please ask your teen to refresh their QR code.',
      );
    const { link, actor } = outcome;
    this.gateway?.emitToUser(
      link.childId,
      'family:pair_requested',
      this.pendingResponse(link, actor),
    );
    return { linkId: link.id, status: link.status };
  }

  private pendingResponse(
    link: { id: string; parentId: string; createdAt: Date; expiresAt: Date },
    parent: { username: string; displayName: string | null; avatar: string | null },
  ): PendingPairRequestDto {
    return {
      linkId: link.id,
      parentId: link.parentId,
      parentUsername: parent.username,
      parentDisplayName: parent.displayName ?? parent.username,
      parentAvatar: parent.avatar,
      createdAt: link.createdAt.toISOString(),
      expiresAt: link.expiresAt.toISOString(),
    };
  }

  async confirmPair(
    childId: string,
    linkId: string,
    approved: boolean,
  ): Promise<{ success: boolean; status: FamilyLinkStatus }> {
    if (approved) this.assertEnrollmentOpen();
    if (typeof approved !== 'boolean' || typeof linkId !== 'string' || !linkId)
      throw new BadRequestException('A link ID and boolean approval are required.');
    const lookup = await this.prisma.familyLink.findUnique({ where: { id: linkId } });
    if (!lookup) throw new NotFoundException('Link request not found.');
    if (lookup.childId !== childId)
      throw new ForbiddenException('You cannot confirm a link request for another account.');
    const link = await this.prisma.$transaction(async (tx) => {
      await lockFamilyUsers(tx, [childId, lookup.parentId]);
      const current = await tx.familyLink.findUniqueOrThrow({
        where: { id: linkId },
        include: familyMembersInclude,
      });
      if (current.status !== 'PENDING_CONFIRMATION')
        throw new BadRequestException('This link request is no longer pending.');
      if (current.expiresAt.getTime() <= Date.now() || !isCurrentMinor(current.child.birthDate))
        throw new BadRequestException('This link request has expired or is no longer eligible.');
      if (approved) await this.assertEligible(tx, current.parentId, childId);
      const result = await tx.familyLink.update({
        where: { id: linkId },
        data: {
          status: approved ? 'ACTIVE' : 'REVOKED',
          confirmedAt: approved ? new Date() : null,
          ...(!approved ? { expiresAt: new Date() } : {}),
        },
      });
      if (approved)
        await tx.familySafeguard.upsert({
          where: { childId },
          create: { childId, updatedByParentId: current.parentId },
          update: {},
        });
      return { ...result, child: current.child };
    });
    if (approved) {
      this.gateway?.emitToUser(link.parentId, 'family:pair_confirmed', {
        linkId,
        childId,
        childUsername: link.child.username,
        childDisplayName: link.child.displayName,
        childAvatar: link.child.avatar,
      });
      this.gateway?.emitToUser(childId, 'family:pair_confirmed', {
        linkId,
        parentId: link.parentId,
      });
    } else this.gateway?.emitToUser(link.parentId, 'family:pair_declined', { linkId });
    return { success: approved, status: link.status };
  }

  async getPendingInvite(childId: string): Promise<PendingPairRequestDto | null> {
    const child = await this.prisma.user.findUnique({
      where: { id: childId },
      select: { birthDate: true },
    });
    if (!isCurrentMinor(child?.birthDate)) return null;
    const link = await this.prisma.familyLink.findFirst({
      where: { childId, status: 'PENDING_CONFIRMATION', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      include: { parent: { select: familyUserSelect } },
    });
    return link ? this.pendingResponse(link, link.parent) : null;
  }

  async getMembers(userId: string) {
    const [user, links] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { birthDate: true } }),
      this.prisma.familyLink.findMany({
        where: { status: 'ACTIVE', OR: [{ parentId: userId }, { childId: userId }] },
        include: familyMembersInclude,
      }),
    ]);
    const active = links.filter((link) => isCurrentMinor(link.child.birthDate));
    const connectedChildren = await Promise.all(
      active
        .filter((link) => link.parentId === userId)
        .map(async (link) => ({
          linkId: link.id,
          id: link.childId,
          username: link.child.username,
          displayName: link.child.displayName,
          avatar: link.child.avatar,
          birthDate: null,
          age: link.child.birthDate ? completedYears(link.child.birthDate) : null,
          status: 'online',
          connectedAt: link.createdAt.toISOString(),
          safeguards: await this.safeguardService.getSafeguards(link.childId),
        })),
    );
    const connectedParents = active
      .filter((link) => link.childId === userId)
      .map((link) => ({
        linkId: link.id,
        id: link.parentId,
        username: link.parent.username,
        displayName: link.parent.displayName,
        avatar: link.parent.avatar,
        connectedAt: link.createdAt.toISOString(),
      }));
    return {
      role: isCurrentMinor(user?.birthDate) ? 'child' : 'parent',
      connectedChildren,
      connectedParents,
      maxChildren: MAX_CHILDREN_PER_PARENT,
      maxParents: MAX_PARENTS_PER_CHILD,
    };
  }

  async revokeFamilyLink(userId: string, linkId: string) {
    const lookup = await this.prisma.familyLink.findUnique({ where: { id: linkId } });
    if (!lookup) throw new NotFoundException('Family link not found.');
    if (lookup.parentId !== userId && lookup.childId !== userId)
      throw new ForbiddenException('You do not have permission to disconnect this family link.');
    await this.prisma.$transaction(async (tx) => {
      await lockFamilyUsers(tx, [lookup.parentId, lookup.childId]);
      await tx.familyLink.update({
        where: { id: linkId },
        data: { status: 'REVOKED', expiresAt: new Date() },
      });
      if (!(await tx.familyLink.count({ where: { childId: lookup.childId, status: 'ACTIVE' } }))) {
        await tx.familySafeguard.deleteMany({ where: { childId: lookup.childId } });
        await tx.familyScreenUsage.deleteMany({ where: { userId: lookup.childId } });
      }
    });
    this.gateway?.emitToUser(
      lookup.parentId === userId ? lookup.childId : lookup.parentId,
      'family:member_removed',
      { linkId, removedByUserId: userId, reason: 'REVOKED_BY_MEMBER' },
    );
    return { success: true, message: 'Family Center link has been disconnected.' };
  }

  async getFamilySettings(userId: string): Promise<FamilySettingsDto> {
    const settings = await this.prisma.familySettings.findUnique({ where: { userId } });
    return {
      weeklyDigest: settings?.weeklyDigest ?? true,
      newFriendAlerts: settings?.newFriendAlerts ?? true,
      reportAlerts: settings?.reportAlerts ?? true,
      notifyLinkRequests: settings?.notifyLinkRequests ?? true,
      pinEnabled: settings?.pinEnabled ?? false,
      pinCode: '',
    };
  }

  async updateFamilySettings(
    userId: string,
    patch: Partial<FamilySettingsDto>,
  ): Promise<FamilySettingsDto> {
    const { pinCode, ...preferences } = patch;
    const pinHash = pinCode ? await argon2.hash(pinCode) : undefined;
    await this.prisma.$transaction(async (tx) => {
      await lockFamilyUsers(tx, [userId]);
      const current = await tx.familySettings.findUnique({ where: { userId } });
      if (preferences.pinEnabled && !pinHash && !current?.pinHash)
        throw new BadRequestException('A PIN is required to enable PIN protection.');
      const data = {
        ...preferences,
        ...(pinHash ? { pinHash } : {}),
        ...(preferences.pinEnabled === false ? { pinHash: null } : {}),
      };
      await tx.familySettings.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
    });
    return this.getFamilySettings(userId);
  }

  async isActiveParentOf(parentId: string, childId: string): Promise<boolean> {
    return hasActiveFamily(this.prisma, childId, parentId);
  }
  async getActivitySummary(
    childId: string,
    requesterId: string,
  ): Promise<FamilyActivitySummaryDto> {
    if (childId !== requesterId && !(await this.isActiveParentOf(requesterId, childId))) {
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
        const safeguards = await this.safeguardService.getSafeguards(childId);
        purchaseAmount = safeguards?.spentThisMonth || 0;
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
