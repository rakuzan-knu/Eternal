import type { User } from '@prisma/client';

export const GITHUB_REPOSITORY = Symbol('GITHUB_REPOSITORY');

export interface IGithubRepository {
  findUserByGithubId(githubId: string): Promise<User | null>;
  findUserById(userId: string): Promise<User | null>;
  findUserByGithubUsername(login: string): Promise<User | null>;
  updateUserGithub(
    userId: string,
    data: {
      githubId?: string | null;
      githubUsername?: string | null;
      mergedPrsCount?: number;
      primaryBadge?: string | null;
    },
  ): Promise<void>;
  unlinkGithubAndBadges(userId: string, contributorBadgeIds: string[]): Promise<void>;
  grantBadges(userId: string, badgeIds: string[]): Promise<void>;
  updateShowcaseGithubAccount(userId: string, ghAccountData: unknown): Promise<void>;
}
