import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { ChildSafeguards } from './family.types';
import { hasActiveFamily, lockFamilyUsers } from './family.persistence';

export function isCurrentTimeInCurfew(
  start: string,
  end: string,
  timezone = 'UTC',
  now = new Date(),
): boolean {
  try {
    const [h, m] = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(now)
      .split(':')
      .map(Number);
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const current = h * 60 + m,
      from = sh * 60 + sm,
      to = eh * 60 + em;
    return from <= to ? current >= from && current < to : current >= from || current < to;
  } catch {
    return false;
  }
}

type SafeguardPatch = Partial<
  Omit<ChildSafeguards, 'childId' | 'updatedByParentId' | 'updatedAt' | 'spentThisMonth'>
>;
@Injectable()
export class FamilySafeguardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnData(userId: string) {
    const [links, totalLinks, invites, settings, safeguards, screenUsage, pairAttempts] =
      await Promise.all([
        this.prisma.familyLink.findMany({
          where: { OR: [{ parentId: userId }, { childId: userId }] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 101,
        }),
        this.prisma.familyLink.count({
          where: { OR: [{ parentId: userId }, { childId: userId }] },
        }),
        this.prisma.familyInvite.findMany({
          where: { childId: userId },
          select: { expiresAt: true, consumedAt: true },
          orderBy: { expiresAt: 'desc' },
          take: 101,
        }),
        this.prisma.familySettings.findUnique({
          where: { userId },
          select: {
            weeklyDigest: true,
            newFriendAlerts: true,
            reportAlerts: true,
            notifyLinkRequests: true,
            pinEnabled: true,
          },
        }),
        this.prisma.familySafeguard.findUnique({ where: { childId: userId } }),
        this.prisma.familyScreenUsage.findMany({
          where: { userId },
          orderBy: { utcDate: 'desc' },
          take: 101,
        }),
        this.prisma.familyPairAttempts.findUnique({
          where: { userId },
          select: { attempts: true, windowStart: true },
        }),
      ]);
    const hasMoreLinks = links.length > 100;
    const hasMoreInvites = invites.length > 100;
    const hasMoreScreenUsage = screenUsage.length > 100;
    const limitations =
      hasMoreLinks || hasMoreInvites || hasMoreScreenUsage
        ? [
            'Family data is limited to the latest 100 rows per collection. Request the remaining records through the assisted data-access process.',
          ]
        : [];
    return {
      links: links.slice(0, 100),
      totalLinks,
      hasMoreLinks,
      invites: invites.slice(0, 100),
      hasMoreInvites,
      settings,
      safeguards,
      screenUsage: screenUsage.slice(0, 100),
      hasMoreScreenUsage,
      pairAttempts,
      limitations,
    };
  }

  async getSafeguards(childId: string) {
    if (!(await hasActiveFamily(this.prisma, childId))) return null;
    const safeguards = await this.prisma.familySafeguard.findUnique({ where: { childId } });
    return safeguards
      ? { ...safeguards, profileLockedByParent: safeguards.profileSettingsLocked }
      : null;
  }

  async updateSafeguards(childId: string, parentId: string, partial: SafeguardPatch) {
    return this.prisma.$transaction(async (tx) => {
      await lockFamilyUsers(tx, [childId, parentId]);
      if (!(await hasActiveFamily(tx, childId, parentId)))
        throw new ForbiddenException('You do not have permission to change these safeguards.');
      const safeguards = await tx.familySafeguard.upsert({
        where: { childId },
        create: { childId, ...partial, updatedByParentId: parentId },
        update: { ...partial, updatedByParentId: parentId },
      });
      return { ...safeguards, profileLockedByParent: safeguards.profileSettingsLocked };
    });
  }

  // One authenticated active UTC minute, deduplicated across HTTP/WS/processes.
  async trackScreenTimeTick(userId: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await lockFamilyUsers(tx, [userId]);
      if (!(await hasActiveFamily(tx, userId))) return 0;
      const now = new Date().toISOString(),
        utcDate = now.slice(0, 10),
        minute = now.slice(0, 16);
      const where = { userId_utcDate: { userId, utcDate } };
      const current = await tx.familyScreenUsage.findUnique({ where });
      if (current?.lastMinute === minute) return current.minutes;
      const usage = await tx.familyScreenUsage.upsert({
        where,
        create: { userId, utcDate, minutes: 1, lastMinute: minute },
        update: { minutes: { increment: 1 }, lastMinute: minute },
      });
      // Retain only today and yesterday, no accumulating activity history.
      const cutoff = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
      await tx.familyScreenUsage.deleteMany({ where: { userId, utcDate: { lt: cutoff } } });
      return usage.minutes;
    });
  }

  async checkScreenTime(childId: string): Promise<{
    isBlocked: boolean;
    reason?: 'CURFEW_HOURS' | 'DAILY_LIMIT_REACHED';
    curfewEnd?: string | null;
    dailyLimitMinutes?: number;
  }> {
    const safeguards = await this.getSafeguards(childId);
    if (!safeguards) return { isBlocked: false };
    if (
      safeguards.curfewStart &&
      safeguards.curfewEnd &&
      isCurrentTimeInCurfew(safeguards.curfewStart, safeguards.curfewEnd, safeguards.timezone)
    )
      return { isBlocked: true, reason: 'CURFEW_HOURS', curfewEnd: safeguards.curfewEnd };
    if (safeguards.dailyLimitMinutes > 0) {
      const now = new Date().toISOString();
      const usage = await this.prisma.familyScreenUsage.findUnique({
        where: {
          userId_utcDate: { userId: childId, utcDate: now.slice(0, 10) },
        },
      });
      // The minute already admitted by the activity tick remains usable until it ends.
      if (
        usage &&
        (usage.minutes > safeguards.dailyLimitMinutes ||
          (usage.minutes === safeguards.dailyLimitMinutes && usage.lastMinute !== now.slice(0, 16)))
      )
        return {
          isBlocked: true,
          reason: 'DAILY_LIMIT_REACHED',
          dailyLimitMinutes: safeguards.dailyLimitMinutes,
        };
    }
    return { isBlocked: false };
  }

  async assertCanUse(userId: string): Promise<void> {
    const status = await this.checkScreenTime(userId);
    if (status.isBlocked)
      throw new ForbiddenException({
        code: 'FAMILY_CURFEW_ACTIVE',
        ...status,
        message:
          status.reason === 'CURFEW_HOURS'
            ? 'Downtime is active. Family Center has restricted platform access.'
            : 'Daily screen time limit reached.',
      });
  }

  async assertCanDirectMessage(
    senderId: string,
    recipientId: string,
    isMutualFriend?: boolean,
  ): Promise<void> {
    const [sender, recipient] = await Promise.all([
      this.getSafeguards(senderId),
      this.getSafeguards(recipientId),
    ]);
    if (!sender?.restrictedDirectMessages && !recipient?.restrictedDirectMessages) return;
    if (isMutualFriend === undefined) {
      const [forward, backward] = await Promise.all([
        this.prisma.follow.count({
          where: { followerId: senderId, followingId: recipientId, status: 'ACCEPTED' },
        }),
        this.prisma.follow.count({
          where: { followerId: recipientId, followingId: senderId, status: 'ACCEPTED' },
        }),
      ]);
      isMutualFriend = forward > 0 && backward > 0;
    }
    if (!isMutualFriend)
      throw new ForbiddenException({
        code: 'FAMILY_SAFEGUARD_DMS_BLOCKED',
        message: 'Family Center restricts direct messages from users outside of mutual friends.',
      });
  }

  async assertCanChangePrivacy(userId: string): Promise<void> {
    if ((await this.getSafeguards(userId))?.profileSettingsLocked)
      throw new ForbiddenException({
        code: 'FAMILY_PROFILE_SETTINGS_LOCKED',
        message: 'Family Center has locked privacy settings.',
      });
  }
}
