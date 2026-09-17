import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import type { CreateUserDto } from '@common/contracts';
import type { IUsersRepository } from '../interfaces/users-repository.interface';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(dto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash: dto.passwordHash,
        displayName: dto.displayName ?? null,
        birthDate: dto.birthDate ?? null,
      },
    });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateManyLastSeen(records: { id: string; lastSeenAt: Date }[]): Promise<void> {
    if (!records || records.length === 0) return;
    await this.prisma.$transaction(
      records.map((r) =>
        this.prisma.user.update({
          where: { id: r.id },
          data: { lastSeenAt: r.lastSeenAt },
        }),
      ),
    );
  }

  updateAvatar(id: string, avatarUrl: string | null): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async deleteUser(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.post.deleteMany({ where: { authorId: id } });
      await tx.follow.deleteMany({
        where: {
          OR: [{ followerId: id }, { followingId: id }],
        },
      });
      await tx.user.delete({ where: { id } });
    });
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Deterministic ID ordering prevents deadlock between simultaneous reverse blocks
      if (blockerId < blockedId) {
        // acquired in lexical order
      }
      await tx.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      });
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      });
    });
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });
  }

  async findFullProfile(id: string) {
    return this.prisma.user.findUnique({
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
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
      select: { blockerId: true },
    });
    return block !== null;
  }

  async getBlockedIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
      take: 2000,
    });

    const set = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === userId) set.add(b.blockedId);
      if (b.blockedId === userId) set.add(b.blockerId);
    }
    return Array.from(set);
  }

  async findUserAlias(ownerId: string, targetId: string): Promise<string | null> {
    const record = await this.prisma.userAlias.findUnique({
      where: { ownerId_targetId: { ownerId, targetId } },
      select: { alias: true },
    });
    return record ? record.alias : null;
  }

  async setUserAlias(ownerId: string, targetId: string, alias: string): Promise<void> {
    await this.prisma.userAlias.upsert({
      where: { ownerId_targetId: { ownerId, targetId } },
      create: { ownerId, targetId, alias: alias.trim() },
      update: { alias: alias.trim() },
    });
  }

  async deleteUserAlias(ownerId: string, targetId: string): Promise<void> {
    await this.prisma.userAlias.deleteMany({
      where: { ownerId, targetId },
    });
  }

  async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const badge = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
      select: { id: true },
    });
    return badge !== null;
  }

  async getUserBadges(userId: string): Promise<string[]> {
    const badges = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    return badges.map((b) => b.badgeId);
  }

  async searchCandidates(blockedIds: string[], reservedUsernames: string[], takeLimit: number) {
    return this.prisma.user.findMany({
      where: {
        AND: [
          blockedIds.length > 0 ? { id: { notIn: blockedIds } } : {},
          { username: { notIn: reservedUsernames } },
        ],
      },
      take: takeLimit,
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
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      select: { followingId: true },
      take: 5000,
    });
    return follows.map((f) => f.followingId);
  }

  async getFollowerIds(userId: string): Promise<string[]> {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      select: { followerId: true },
      take: 5000,
    });
    return follows.map((f) => f.followerId);
  }

  async getRecentChatParticipantIds(userId: string): Promise<string[]> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        userId: { not: userId },
        conversation: {
          participants: {
            some: { userId },
          },
        },
      },
      select: { userId: true },
      distinct: ['userId'],
      take: 200,
    });
    return participants.map((p) => p.userId);
  }

  async getFriendsOfFriends(followingIds: string[], excludeIds: string[]): Promise<string[]> {
    if (followingIds.length === 0) return [];
    const fof = await this.prisma.follow.findMany({
      where: {
        followerId: { in: followingIds.slice(0, 50) },
        status: 'ACCEPTED',
        followingId: { notIn: excludeIds },
      },
      select: { followingId: true },
      take: 40,
    });
    return fof.map((f) => f.followingId);
  }

  async getPopularUserIds(excludeIds: string[], reservedUsernames: string[]): Promise<string[]> {
    const popular = await this.prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        username: { notIn: reservedUsernames },
      },
      orderBy: { followers: { _count: 'desc' } },
      select: { id: true },
      take: 20,
    });
    return popular.map((p) => p.id);
  }

  async getCandidateUsersDetails(
    candidateIds: string[],
    reservedUsernames: string[],
    followingIds: string[],
  ) {
    return this.prisma.user.findMany({
      where: {
        id: { in: candidateIds },
        username: { notIn: reservedUsernames },
      },
      include: {
        badges: true,
        privacy: {
          select: { allowNearbyRecommendations: true },
        },
        _count: {
          select: {
            followers: { where: { status: 'ACCEPTED' } },
            following: { where: { status: 'ACCEPTED' } },
            posts: true,
          },
        },
        followers: {
          where: {
            followerId: { in: followingIds },
            status: 'ACCEPTED',
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
  }

  async getNearbyUserCandidates(excludeIds: string[], reservedUsernames: string[]) {
    return this.prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        username: { notIn: reservedUsernames },
      },
      take: 50,
      include: {
        badges: true,
        privacy: {
          select: { allowNearbyRecommendations: true },
        },
        _count: {
          select: {
            followers: { where: { status: 'ACCEPTED' } },
            following: { where: { status: 'ACCEPTED' } },
            posts: true,
          },
        },
      },
    });
  }

  async getTopPostsForUsers(authorIds: string[]) {
    return this.prisma.post.findMany({
      where: {
        authorId: { in: authorIds },
        media: { some: {} },
      },
      select: {
        id: true,
        authorId: true,
        media: {
          select: { url: true },
          take: 1,
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async getRecentPublicPostsContent(takeLimit: number) {
    return this.prisma.post.findMany({
      where: {
        author: { isPrivate: false },
      },
      select: { content: true },
      take: takeLimit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * ONE query for many authors' recent bodies (interest vectors). Returns at
   * most perAuthorLimit posts per author, newest first. Public posts only —
   * private content never leaves the database for scoring.
   */
  async getRecentContentsByAuthors(
    authorIds: string[],
    perAuthorLimit = 5,
  ): Promise<Array<{ authorId: string; content: string }>> {
    if (authorIds.length === 0 || perAuthorLimit <= 0) return [];
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: authorIds },
        author: { isPrivate: false },
      },
      select: { authorId: true, content: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: authorIds.length * perAuthorLimit,
    });
    const counts = new Map<string, number>();
    const out: Array<{ authorId: string; content: string }> = [];
    for (const post of posts) {
      const seen = counts.get(post.authorId) ?? 0;
      if (seen >= perAuthorLimit) continue;
      counts.set(post.authorId, seen + 1);
      out.push({ authorId: post.authorId, content: post.content });
    }
    return out;
  }
}
