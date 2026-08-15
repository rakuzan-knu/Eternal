import { Injectable, NotFoundException } from '@nestjs/common';
import { IPostRepository } from './interfaces/posts-repository.interface';
import { PrismaService } from '@common/prisma';
import {
  FollowStatus,
  type Post,
  type PostMedia,
  type Prisma,
  type ReportCategory,
} from '@prisma/client';
import type { PostWithRelations } from '@common/contracts';

type PrismaPostQueryResult = {
  id: string;
  content: string;
  sharesCount?: number;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  media?: PostMedia[];
  poll?: {
    id: string;
    title: string;
    description?: string | null;
    isMultiple: boolean;
    isActive: boolean;
    options: {
      id: string;
      optionText: string;
      votesCount: number;
    }[];
    votes?: { optionId: string }[];
  } | null;
  author?: {
    id?: string;
    username?: string;
    displayName?: string | null;
    avatar?: string | null;
    isVerified?: boolean;
    primaryBadge?: string | null;
    followers?: { id: string }[];
  } | null;
  savedPosts?: { id: string }[] | null;
  reposts?: { id: string }[] | null;
  likes?: { id: string }[] | null;
  _count?: { likes?: number; reposts?: number; comments?: number } | null;
};

@Injectable()
export class PostsRepository implements IPostRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });

    const set = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === userId) set.add(b.blockedId);
      if (b.blockedId === userId) set.add(b.blockerId);
    }
    return Array.from(set);
  }

  private postInclude(viewerId?: string) {
    return {
      media: { orderBy: { order: 'asc' as const } },
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          isVerified: true,
          primaryBadge: true,
          ...(viewerId
            ? {
                followers: {
                  where: { followerId: viewerId },
                  select: { id: true },
                  take: 1,
                },
              }
            : {}),
        },
      },
      poll: {
        include: {
          options: {
            orderBy: { sortOrder: 'asc' as const },
          },
          ...(viewerId
            ? {
                votes: {
                  where: { userId: viewerId },
                  select: { optionId: true },
                },
              }
            : {}),
        },
      },
      ...(viewerId
        ? {
            likes: {
              where: { userId: viewerId },
              select: { id: true },
              take: 1,
            },
            savedPosts: {
              where: { userId: viewerId },
              select: { id: true },
              take: 1,
            },
            reposts: {
              where: { userId: viewerId },
              select: { id: true },
              take: 1,
            },
          }
        : {}),
      _count: {
        select: {
          likes: true,
          reposts: true,
          comments: true,
        },
      },
    };
  }

  private mapPost(post: PrismaPostQueryResult, viewerId?: string): PostWithRelations {
    const authorRecord = post.author;

    const isFollowing = viewerId != null ? (authorRecord?.followers?.length ?? 0) > 0 : false;
    const isSaved = viewerId != null ? (post.savedPosts?.length ?? 0) > 0 : false;
    const isReposted = viewerId != null ? (post.reposts?.length ?? 0) > 0 : false;
    const isLiked = viewerId != null ? (post.likes?.length ?? 0) > 0 : false;
    const isOwner = viewerId != null ? post.authorId === viewerId : false;

    return {
      id: post.id,
      content: post.content,
      sharesCount: post.sharesCount ?? 0,
      authorId: post.authorId,
      author: authorRecord
        ? {
            id: authorRecord.id ?? post.authorId,
            username: authorRecord.username ?? 'user',
            displayName: authorRecord.displayName ?? null,
            avatar: authorRecord.avatar ?? null,
            isVerified: authorRecord.isVerified ?? false,
            primaryBadge: authorRecord.primaryBadge ?? null,
          }
        : undefined,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      media: post.media ?? [],
      poll: post.poll ?? null,
      isFollowing,
      isSaved,
      isReposted,
      isLiked,
      isOwner,
      _count: post._count ?? undefined,
    };
  }

  async incrementShareCount(postId: string): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        sharesCount: { increment: 1 },
      },
    });
  }

  async createPost(data: Prisma.PostCreateInput): Promise<PostWithRelations> {
    const created = await this.prisma.post.create({
      data,
      include: this.postInclude(),
    });
    return this.mapPost(created);
  }

  async getAllPosts(
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<PostWithRelations[]> {
    const blockedIds = viewerId ? await this.getBlockedUserIds(viewerId) : [];

    const posts = await this.prisma.post.findMany({
      where: blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : undefined,
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: this.postInclude(viewerId),
    });

    return posts.map((post) => this.mapPost(post, viewerId));
  }

  async getPostById(id: string, viewerId?: string): Promise<PostWithRelations | null> {
    const blockedIds = viewerId ? await this.getBlockedUserIds(viewerId) : [];

    const post = await this.prisma.post.findUnique({
      where: { id },
      include: this.postInclude(viewerId),
    });

    if (!post) return null;
    if (blockedIds.includes(post.authorId)) return null;

    return this.mapPost(post, viewerId);
  }

  async getPostsByUserId(
    userId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<PostWithRelations[]> {
    if (viewerId) {
      const blockedIds = await this.getBlockedUserIds(viewerId);
      if (blockedIds.includes(userId)) return [];
    }

    const posts = await this.prisma.post.findMany({
      where: { authorId: userId },
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: this.postInclude(viewerId),
    });

    return posts.map((post) => this.mapPost(post, viewerId));
  }

  async getRepostsByUserId(
    userId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<PostWithRelations[]> {
    if (viewerId) {
      const blockedIds = await this.getBlockedUserIds(viewerId);
      if (blockedIds.includes(userId)) return [];
    }

    const reposts = await this.prisma.repost.findMany({
      where: { userId },
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        post: {
          include: this.postInclude(viewerId),
        },
      },
    });

    const blockedIds = viewerId ? await this.getBlockedUserIds(viewerId) : [];
    return reposts
      .filter((r) => !blockedIds.includes(r.post.authorId))
      .map((r) => this.mapPost(r.post, viewerId));
  }

  async getSavedPostsByUserId(
    userId: string,
    limit: number,
    after?: string,
  ): Promise<PostWithRelations[]> {
    const blockedIds = await this.getBlockedUserIds(userId);

    const saved = await this.prisma.savedPost.findMany({
      where: {
        userId,
        post: blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : undefined,
      },
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        post: {
          include: this.postInclude(userId),
        },
      },
    });

    return saved.map((s) => this.mapPost(s.post, userId));
  }

  async getExploreMediaPosts(
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<PostWithRelations[]> {
    const blockedIds = viewerId ? await this.getBlockedUserIds(viewerId) : [];

    const andFilters: Prisma.PostWhereInput[] = [{ media: { some: {} } }];

    if (blockedIds.length > 0) {
      andFilters.push({ authorId: { notIn: blockedIds } });
    }

    if (viewerId) {
      andFilters.push({
        OR: [
          { author: { isPrivate: false } },
          { authorId: viewerId },
          {
            author: {
              followers: {
                some: { followerId: viewerId, status: FollowStatus.ACCEPTED },
              },
            },
          },
        ],
      });
    } else {
      andFilters.push({ author: { isPrivate: false } });
    }

    const posts = await this.prisma.post.findMany({
      where: { AND: andFilters },
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: this.postInclude(viewerId),
    });

    if (posts.length === 0 && !after) {
      const fallbackFilters: Prisma.PostWhereInput[] = [];
      if (blockedIds.length > 0) {
        fallbackFilters.push({ authorId: { notIn: blockedIds } });
      }
      if (viewerId) {
        fallbackFilters.push({
          OR: [
            { author: { isPrivate: false } },
            { authorId: viewerId },
            {
              author: {
                followers: {
                  some: { followerId: viewerId, status: FollowStatus.ACCEPTED },
                },
              },
            },
          ],
        });
      } else {
        fallbackFilters.push({ author: { isPrivate: false } });
      }

      const fallbackPosts = await this.prisma.post.findMany({
        where: fallbackFilters.length > 0 ? { AND: fallbackFilters } : undefined,
        take: limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: this.postInclude(viewerId),
      });

      return fallbackPosts.map((post) => this.mapPost(post, viewerId));
    }

    return posts.map((post) => this.mapPost(post, viewerId));
  }

  async getPostsByHashtag(
    hashtag: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<{ posts: PostWithRelations[]; totalCount: number }> {
    const cleanTag = hashtag.replace(/^#+/, '').trim();
    const blockedIds = viewerId ? await this.getBlockedUserIds(viewerId) : [];

    const andFilters: Prisma.PostWhereInput[] = [
      { content: { contains: `#${cleanTag}`, mode: 'insensitive' } },
    ];

    if (blockedIds.length > 0) {
      andFilters.push({ authorId: { notIn: blockedIds } });
    }

    if (viewerId) {
      andFilters.push({
        OR: [
          { author: { isPrivate: false } },
          { authorId: viewerId },
          {
            author: {
              followers: {
                some: { followerId: viewerId, status: FollowStatus.ACCEPTED },
              },
            },
          },
        ],
      });
    } else {
      andFilters.push({ author: { isPrivate: false } });
    }

    const whereClause: Prisma.PostWhereInput = { AND: andFilters };

    const [posts, totalCount] = await Promise.all([
      this.prisma.post.findMany({
        where: whereClause,
        take: limit + 1,
        skip: after ? 1 : 0,
        cursor: after ? { id: after } : undefined,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: this.postInclude(viewerId),
      }),
      this.prisma.post.count({ where: whereClause }),
    ]);

    return {
      posts: posts.map((post) => this.mapPost(post, viewerId)),
      totalCount,
    };
  }

  async searchPosts(
    query: string,
    limit: number,
    after?: string,
    viewerId?: string,
    mediaOnly?: boolean,
  ): Promise<PostWithRelations[]> {
    const term = (query || '').trim();
    if (!term) return [];

    const blockedIds = viewerId ? await this.getBlockedUserIds(viewerId) : [];

    const andFilters: Prisma.PostWhereInput[] = [
      { content: { contains: term, mode: 'insensitive' } },
    ];

    if (blockedIds.length > 0) {
      andFilters.push({ authorId: { notIn: blockedIds } });
    }

    if (mediaOnly) {
      andFilters.push({ media: { some: {} } });
    }

    if (viewerId) {
      andFilters.push({
        OR: [
          { author: { isPrivate: false } },
          { authorId: viewerId },
          {
            author: {
              followers: {
                some: { followerId: viewerId, status: FollowStatus.ACCEPTED },
              },
            },
          },
        ],
      });
    } else {
      andFilters.push({ author: { isPrivate: false } });
    }

    const posts = await this.prisma.post.findMany({
      where: { AND: andFilters },
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: this.postInclude(viewerId),
    });

    return posts.map((post) => this.mapPost(post, viewerId));
  }

  async editPost(id: string, data: Prisma.PostUpdateInput): Promise<PostWithRelations> {
    const edited = await this.prisma.post.update({
      where: { id },
      data,
      include: this.postInclude(),
    });
    return this.mapPost(edited);
  }

  async deletePost(id: string): Promise<Post> {
    return this.prisma.post.delete({ where: { id } });
  }

  async savePost(postId: string, userId: string): Promise<void> {
    await this.prisma.savedPost.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId },
      update: {},
    });
  }

  async unsavePost(postId: string, userId: string): Promise<void> {
    await this.prisma.savedPost.deleteMany({
      where: { postId, userId },
    });
  }

  async repost(postId: string, userId: string): Promise<void> {
    await this.prisma.repost.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId },
      update: {},
    });
  }

  async unrepost(postId: string, userId: string): Promise<void> {
    await this.prisma.repost.deleteMany({
      where: { postId, userId },
    });
  }

  async reportPost(
    postId: string,
    reporterId: string,
    category: ReportCategory,
    details?: string,
  ): Promise<{ id: string }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedId: post.authorId,
        postId,
        category,
        details,
      },
      select: { id: true },
    });

    return report;
  }
}
