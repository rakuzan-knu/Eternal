import { Inject, Injectable } from '@nestjs/common';
import { ExceptionMode, FollowStatus, PrivacyDimension, Visibility } from '@prisma/client';
import {
  PRIVACY_REPOSITORY,
  type IPrivacyRepository,
} from './interfaces/privacy-repository.interface';

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
  constructor(
    @Inject(PRIVACY_REPOSITORY)
    private readonly privacyRepo: IPrivacyRepository,
  ) {}

  async loadContext(ownerIds: string[], viewerId: string | null): Promise<VisibilityContext> {
    const uniqueOwners = [...new Set(ownerIds)];

    const { privacyRows, exceptionRows, followRows, blockRows } =
      await this.privacyRepo.loadVisibilityContextData(uniqueOwners, viewerId);

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

    const { privacyRow, exceptionRows, followRows, blockRows } =
      await this.privacyRepo.loadPresenceAudienceData(ownerId, uniqueViewers);

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
