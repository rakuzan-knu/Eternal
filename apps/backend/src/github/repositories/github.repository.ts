import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import type { User } from '@prisma/client';
import type { IGithubRepository } from '../interfaces/github-repository.interface';

@Injectable()
export class GithubRepository implements IGithubRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByGithubId(githubId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { githubId },
    });
  }

  findUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  findUserByGithubUsername(login: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        githubUsername: {
          equals: login,
          mode: 'insensitive',
        },
      },
    });
  }

  async updateUserGithub(
    userId: string,
    data: {
      githubId?: string | null;
      githubUsername?: string | null;
      mergedPrsCount?: number;
      primaryBadge?: string | null;
    },
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async unlinkGithubAndBadges(userId: string, contributorBadgeIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          githubId: null,
          githubUsername: null,
          mergedPrsCount: 0,
        },
      }),
      this.prisma.userBadge.deleteMany({
        where: {
          userId,
          badgeId: { in: contributorBadgeIds },
        },
      }),
    ]);
  }

  async grantBadges(userId: string, badgeIds: string[]): Promise<void> {
    if (badgeIds.length === 0) return;
    await this.prisma.userBadge.createMany({
      data: badgeIds.map((badgeId) => ({ userId, badgeId })),
      skipDuplicates: true,
    });
  }

  async updateShowcaseGithubAccount(userId: string, ghAccountData: unknown): Promise<void> {
    const showcase = await this.prisma.profileShowcase.findUnique({
      where: { userId },
    });
    const currentAccounts = (showcase?.connectedAccounts as Record<string, any>) || {};
    currentAccounts.github = ghAccountData;

    await this.prisma.profileShowcase.upsert({
      where: { userId },
      create: {
        userId,
        connectedAccounts: currentAccounts,
      },
      update: {
        connectedAccounts: currentAccounts,
      },
    });
  }
}
