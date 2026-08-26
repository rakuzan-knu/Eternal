import { Injectable } from '@nestjs/common';
import { ExceptionMode, FollowStatus, PrivacyDimension, Visibility } from '@prisma/client';
import { PrismaService } from '@common/prisma';

interface ExceptionSets {
  allow: Set<string>;
  deny: Set<string>;
}

export interface VisibilityContext {
  viewerId: string | null;
  exceptions: Map<string, Map<PrivacyDimension, ExceptionSets>>;
  visibility: Map<string, Record<PrivacyDimension, Visibility>>;
  acceptedFollowing: Set<string>;
  pendingFollowing: Set<string>;
  blocked: Set<string>;
}

const DIMENSION_DEFAULT: Record<PrivacyDimension, Visibility> = {
  LAST_SEEN: Visibility.EVERYBODY,
  AVATAR: Visibility.EVERYBODY,
  BANNER: Visibility.EVERYBODY,
  FORWARD_LINK: Visibility.EVERYBODY,
  CALLS: Visibility.EVERYBODY,
  VOICE_MESSAGES: Visibility.EVERYBODY,
  MESSAGES: Visibility.EVERYBODY,
  BIRTHDAY: Visibility.NOBODY,
  BIO: Visibility.EVERYBODY,
  GROUP_INVITES: Visibility.EVERYBODY,
  THEME_PROPOSALS: Visibility.EVERYBODY,
};

const PRIVACY_COLUMN: Record<PrivacyDimension, keyof UserPrivacyRow> = {
  LAST_SEEN: 'lastSeen',
  AVATAR: 'avatar',
  BANNER: 'banner',
  FORWARD_LINK: 'forwardLink',
  CALLS: 'calls',
  VOICE_MESSAGES: 'voiceMessages',
  MESSAGES: 'messages',
  BIRTHDAY: 'birthday',
  BIO: 'bio',
  GROUP_INVITES: 'groupInvites',
  THEME_PROPOSALS: 'themeProposals',
};

type UserPrivacyRow = {
  userId: string;
  lastSeen: Visibility;
  avatar: Visibility;
  banner: Visibility;
  forwardLink: Visibility;
  calls: Visibility;
  voiceMessages: Visibility;
  messages: Visibility;
  birthday: Visibility;
  bio: Visibility;
  groupInvites: Visibility;
  themeProposals: Visibility;
};

const ALL_DIMENSIONS = Object.keys(DIMENSION_DEFAULT) as PrivacyDimension[];

@Injectable()
export class VisibilityResolver {
  constructor(private readonly prisma: PrismaService) {}

  async loadContext(ownerIds: string[], viewerId: string | null): Promise<VisibilityContext> {
    const uniqueOwners = [...new Set(ownerIds)];

    const [privacyRows, exceptionRows, followRows, blockRows] = await Promise.all([
      this.prisma.userPrivacy.findMany({ where: { userId: { in: uniqueOwners } } }),
      this.prisma.privacyException.findMany({
        where: { ownerId: { in: uniqueOwners } },
        select: { ownerId: true, dimension: true, mode: true, targetId: true },
      }),
      viewerId
        ? this.prisma.follow.findMany({
            where: { followerId: viewerId, followingId: { in: uniqueOwners } },
            select: { followingId: true, status: true },
          })
        : Promise.resolve([]),
      viewerId
        ? this.prisma.userBlock.findMany({
            where: {
              OR: [
                { blockerId: viewerId, blockedId: { in: uniqueOwners } },
                { blockedId: viewerId, blockerId: { in: uniqueOwners } },
              ],
            },
            select: { blockerId: true, blockedId: true },
          })
        : Promise.resolve([]),
    ]);

    const visibility = new Map<string, Record<PrivacyDimension, Visibility>>();
    for (const ownerId of uniqueOwners) {
      visibility.set(ownerId, { ...DIMENSION_DEFAULT });
    }
    for (const row of privacyRows as UserPrivacyRow[]) {
      const map = visibility.get(row.userId);
      if (!map) continue;
      for (const dim of ALL_DIMENSIONS) {
        map[dim] = row[PRIVACY_COLUMN[dim]] as Visibility;
      }
    }

    const exceptions = new Map<string, Map<PrivacyDimension, ExceptionSets>>();
    for (const row of exceptionRows) {
      let byDim = exceptions.get(row.ownerId);
      if (!byDim) {
        byDim = new Map();
        exceptions.set(row.ownerId, byDim);
      }
      let sets = byDim.get(row.dimension);
      if (!sets) {
        sets = { allow: new Set(), deny: new Set() };
        byDim.set(row.dimension, sets);
      }
      (row.mode === ExceptionMode.ALLOW ? sets.allow : sets.deny).add(row.targetId);
    }

    const acceptedFollowing = new Set<string>();
    const pendingFollowing = new Set<string>();
    for (const row of followRows) {
      if (row.status === FollowStatus.ACCEPTED) acceptedFollowing.add(row.followingId);
      else pendingFollowing.add(row.followingId);
    }

    const blocked = new Set<string>();
    for (const row of blockRows) {
      blocked.add(row.blockerId === viewerId ? row.blockedId : row.blockerId);
    }

    return {
      viewerId,
      exceptions,
      visibility,
      acceptedFollowing,
      pendingFollowing,
      blocked,
    };
  }

  isFollower(ownerId: string, ctx: VisibilityContext): boolean {
    return ctx.acceptedFollowing.has(ownerId);
  }

  resolve(dimension: PrivacyDimension, ownerId: string, ctx: VisibilityContext): boolean {
    const { viewerId } = ctx;
    if (viewerId === ownerId) return true; // owner always sees own data
    if (viewerId && ctx.blocked.has(ownerId)) return false;

    const sets = ctx.exceptions.get(ownerId)?.get(dimension);
    if (viewerId && sets) {
      if (sets.deny.has(viewerId)) return false;
      if (sets.allow.has(viewerId)) return true;
    }

    const base = ctx.visibility.get(ownerId)?.[dimension] ?? DIMENSION_DEFAULT[dimension];
    switch (base) {
      case Visibility.EVERYBODY:
        return true;
      case Visibility.CONTACTS:
        return viewerId ? ctx.acceptedFollowing.has(ownerId) : false;
      case Visibility.NOBODY:
      default:
        return false;
    }
  }

  async resolvePresenceAudience(ownerId: string, viewerIds: string[]): Promise<Set<string>> {
    const uniqueViewers = [...new Set(viewerIds)].filter((v) => v !== ownerId);
    if (uniqueViewers.length === 0) return new Set();

    const [privacyRow, exceptionRows, followRows, blockRows] = await Promise.all([
      this.prisma.userPrivacy.findUnique({ where: { userId: ownerId } }),
      this.prisma.privacyException.findMany({
        where: { ownerId, dimension: PrivacyDimension.LAST_SEEN },
        select: { mode: true, targetId: true },
      }),
      this.prisma.follow.findMany({
        where: {
          followingId: ownerId,
          followerId: { in: uniqueViewers },
          status: FollowStatus.ACCEPTED,
        },
        select: { followerId: true },
      }),
      this.prisma.userBlock.findMany({
        where: {
          OR: [
            { blockerId: ownerId, blockedId: { in: uniqueViewers } },
            { blockedId: ownerId, blockerId: { in: uniqueViewers } },
          ],
        },
        select: { blockerId: true, blockedId: true },
      }),
    ]);

    const base = privacyRow?.lastSeen ?? DIMENSION_DEFAULT.LAST_SEEN;
    const allow = new Set<string>();
    const deny = new Set<string>();
    for (const row of exceptionRows) {
      (row.mode === ExceptionMode.ALLOW ? allow : deny).add(row.targetId);
    }
    const followers = new Set(followRows.map((r: { followerId: string }) => r.followerId));
    const blocked = new Set<string>();
    for (const row of blockRows) {
      blocked.add(row.blockerId === ownerId ? row.blockedId : row.blockerId);
    }

    const audience = new Set<string>();
    for (const viewerId of uniqueViewers) {
      if (blocked.has(viewerId)) continue;
      if (deny.has(viewerId)) continue;
      if (allow.has(viewerId)) {
        audience.add(viewerId);
        continue;
      }
      if (base === Visibility.EVERYBODY) audience.add(viewerId);
      else if (base === Visibility.CONTACTS && followers.has(viewerId)) audience.add(viewerId);
    }
    return audience;
  }
}
