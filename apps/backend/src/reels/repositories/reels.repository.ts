import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { type Prisma, ReportCategory } from '@prisma/client';
import type {
  IReelsRepository,
  ReelCommentWithUser,
  ReelWithAuthor,
  ReelsFeedExclusions,
} from '../interfaces/reels-repository.interface';

const AUTHOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  displayNameStyle: true,
  avatar: true,
  activeDecoration: true,
  isVerified: true,
} as const;

const REPORT_CATEGORY_MAP: Record<string, ReportCategory> = {
  SPAM: ReportCategory.SPAM,
  SUICIDE_SELF_HARM: ReportCategory.SUICIDE_SELF_HARM,
  IMPERSONATION: ReportCategory.IMPERSONATION,
  VIOLENCE_DANGEROUS_ORGS: ReportCategory.VIOLENCE_DANGEROUS_ORGS,
  VIOLENCE: ReportCategory.VIOLENCE_DANGEROUS_ORGS,
  NUDITY_SEXUAL: ReportCategory.NUDITY_SEXUAL,
  INAPPROPRIATE: ReportCategory.NUDITY_SEXUAL,
  RESTRICTED_GOODS: ReportCategory.RESTRICTED_GOODS,
  FRAUD: ReportCategory.FRAUD,
  HARASSMENT: ReportCategory.OTHER,
  HATE_SPEECH: ReportCategory.OTHER,
  OTHER: ReportCategory.OTHER,
};

@Injectable()
export class ReelsRepository implements IReelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getAuthorSelect(viewerId?: string) {
    return {
      ...AUTHOR_SELECT,
      ...(viewerId
        ? {
            followers: {
              where: { followerId: viewerId, status: 'ACCEPTED' as const },
              select: { followerId: true },
            },
          }
        : {}),
    };
  }

  private visibleTo(viewerId?: string): Prisma.ReelWhereInput {
    return {
      author: {
        ...(viewerId
          ? {
              blockedUsers: { none: { blockedId: viewerId } },
              blockedByUsers: { none: { blockerId: viewerId } },
              OR: [
                { id: viewerId },
                { isPrivate: false },
                { followers: { some: { followerId: viewerId, status: 'ACCEPTED' } } },
              ],
            }
          : { isPrivate: false }),
      },
    };
  }

  private reelInclude(viewerId?: string) {
    return {
      author: { select: this.getAuthorSelect(viewerId) },
      _count: { select: { likes: true, comments: true, saves: true } },
      ...(viewerId
        ? {
            likes: { where: { userId: viewerId }, select: { userId: true } },
            saves: { where: { userId: viewerId }, select: { userId: true } },
          }
        : {}),
    } satisfies Prisma.ReelInclude;
  }

  async findAllPaginated(
    limit: number,
    after?: string,
    viewerId?: string,
    exclusions?: ReelsFeedExclusions,
  ): Promise<ReelWithAuthor[]> {
    return this.prisma.reel.findMany({
      where: {
        ...this.visibleTo(viewerId),
        ...(exclusions?.reelIds.length ? { id: { notIn: exclusions.reelIds } } : {}),
        ...(exclusions?.authorIds.length ? { authorId: { notIn: exclusions.authorIds } } : {}),
      },
      take: limit,
      ...(after ? { skip: 1, cursor: { id: after } } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: this.reelInclude(viewerId),
    });
  }

  async findByUserId(
    userId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<ReelWithAuthor[]> {
    return this.prisma.reel.findMany({
      where: { authorId: userId, ...this.visibleTo(viewerId) },
      take: limit,
      ...(after ? { skip: 1, cursor: { id: after } } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: this.reelInclude(viewerId),
    });
  }

  async findById(id: string, viewerId?: string): Promise<ReelWithAuthor | null> {
    return this.prisma.reel.findFirst({
      where: { id, ...this.visibleTo(viewerId) },
      include: this.reelInclude(viewerId),
    });
  }

  async findSaved(userId: string, limit: number, after?: string) {
    const cursor = after
      ? await this.prisma.savedReel.findFirst({
          where: { id: after, userId },
          select: { id: true, createdAt: true },
        })
      : null;
    if (after && !cursor) throw new BadRequestException('Invalid saved reels cursor');
    return this.prisma.savedReel.findMany({
      where: {
        userId,
        reel: this.visibleTo(userId),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { reel: { include: this.reelInclude(userId) } },
    });
  }

  async setSaved(reelId: string, userId: string, saved: boolean) {
    return this.prisma.$transaction(async (tx) => {
      if (saved) {
        const reel = await tx.reel.findFirst({
          where: { id: reelId, ...this.visibleTo(userId) },
          select: { id: true },
        });
        if (!reel) throw new NotFoundException('Reel not found');
        // skipDuplicates handles concurrent retries without toggling the user's intent.
        await tx.savedReel.createMany({ data: [{ reelId, userId }], skipDuplicates: true });
      } else {
        await tx.savedReel.deleteMany({ where: { reelId, userId } });
      }
      // Removing your own bookmark remains allowed after access is revoked, but
      // the response must not expose aggregate counts for inaccessible content.
      const visible =
        saved ||
        (await tx.reel.findFirst({
          where: { id: reelId, ...this.visibleTo(userId) },
          select: { id: true },
        }));
      const savedCount = visible ? await tx.savedReel.count({ where: { reelId } }) : 0;
      return { saved, savedCount };
    });
  }

  async create(data: Prisma.ReelCreateInput): Promise<ReelWithAuthor> {
    return await this.prisma.reel.create({
      data,
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });
  }

  async update(id: string, data: Prisma.ReelUpdateInput): Promise<ReelWithAuthor> {
    return await this.prisma.reel.update({
      where: { id },
      data,
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.reel.delete({ where: { id } });
  }

  async toggleLike(
    reelId: string,
    userId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.reelLike.findUnique({
        where: { reelId_userId: { reelId, userId } },
      });

      if (existing) {
        await tx.reelLike.delete({
          where: { reelId_userId: { reelId, userId } },
        });
        const updated = await tx.reel.update({
          where: { id: reelId },
          data: { likesCount: { decrement: 1 } },
          select: { likesCount: true },
        });
        return { liked: false, likesCount: Math.max(0, updated.likesCount) };
      } else {
        await tx.reelLike.create({
          data: { reelId, userId },
        });
        const updated = await tx.reel.update({
          where: { id: reelId },
          data: { likesCount: { increment: 1 } },
          select: { likesCount: true },
        });
        return { liked: true, likesCount: updated.likesCount };
      }
    });
  }

  async incrementViews(reelId: string): Promise<void> {
    await this.prisma.reel.update({
      where: { id: reelId },
      data: { viewsCount: { increment: 1 } },
    });
  }

  async incrementShares(reelId: string): Promise<void> {
    await this.prisma.reel.update({
      where: { id: reelId },
      data: { sharesCount: { increment: 1 } },
    });
  }

  async addComment(reelId: string, userId: string, content: string): Promise<ReelCommentWithUser> {
    return await this.prisma.$transaction(async (tx) => {
      const comment = await tx.reelComment.create({
        data: {
          reelId,
          userId,
          content,
        },
        include: {
          user: { select: AUTHOR_SELECT },
        },
      });

      await tx.reel.update({
        where: { id: reelId },
        data: { commentsCount: { increment: 1 } },
      });

      return comment;
    });
  }

  async findComments(reelId: string, limit = 20, after?: string): Promise<ReelCommentWithUser[]> {
    return await this.prisma.reelComment.findMany({
      where: { reelId },
      take: limit,
      ...(after ? { skip: 1, cursor: { id: after } } : {}),
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: AUTHOR_SELECT },
      },
    });
  }

  async reportReel(
    reelId: string,
    reporterId: string,
    category: string,
    details?: string,
  ): Promise<void> {
    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
      select: { authorId: true },
    });
    if (!reel) throw new NotFoundException('Reel not found');

    const cat = REPORT_CATEGORY_MAP[category] ?? ReportCategory.OTHER;

    await this.prisma.report.create({
      data: {
        category: cat,
        details: details ? `[Reel: ${reelId}] ${details}` : `[Reel: ${reelId}] Reported content`,
        reporterId,
        reportedId: reel.authorId,
      },
    });
  }
}
