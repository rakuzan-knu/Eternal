import { ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { SnowflakeService } from '../common/id/snowflake.service';
import type { ICommentsRepository } from './interfaces/comments-repository.interface';
import type { CreateCommentDto, CommentWithUser } from '@common/contracts';

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  isVerified: true,
  primaryBadge: true,
};

const replyToUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
};

@Injectable()
export class CommentsRepository implements ICommentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly snowflake?: SnowflakeService,
  ) {}

  async addComment(
    postId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentWithUser> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    let rootParentId: string | null = null;
    let replyToUserId: string | null = dto.replyToUserId || null;

    if (dto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parentComment || parentComment.postId !== postId) {
        throw new NotFoundException('Parent comment not found');
      }
      rootParentId = parentComment.rootParentId || parentComment.id;
      if (!replyToUserId) {
        replyToUserId = parentComment.userId;
      }
    }

    return this.prisma.comment.create({
      data: {
        text: dto.text,
        postId,
        userId,
        parentId: dto.parentId || null,
        rootParentId,
        replyToUserId,
        mediaUrl: dto.mediaUrl || null,
        ...(this.snowflake ? { id: this.snowflake.generate() } : {}),
      },
      include: {
        user: { select: userSelect },
        replyToUser: { select: replyToUserSelect },
        likes: { select: { userId: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });
  }

  async getCommentsByPostId(
    postId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<CommentWithUser[]> {
    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        parentId: null, // Root comments only
      },
      take: limit + 1,
      skip: after ? 1 : 0,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      ...(after ? { cursor: { id: after } } : {}),
      include: {
        user: { select: userSelect },
        replyToUser: { select: replyToUserSelect },
        likes: { select: { userId: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    return comments.map((c) => ({
      ...c,
      isLiked: Boolean(
        viewerId && Array.isArray(c.likes) && c.likes.some((l) => l.userId === viewerId),
      ),
      isLikedByAuthor: Boolean(
        post?.authorId && Array.isArray(c.likes) && c.likes.some((l) => l.userId === post.authorId),
      ),
      likesCount: c._count?.likes ?? (Array.isArray(c.likes) ? c.likes.length : 0),
      replyCount: c._count?.replies ?? 0,
    }));
  }

  async getRepliesByRootId(
    rootCommentId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<CommentWithUser[]> {
    const rootComment = await this.prisma.comment.findUnique({
      where: { id: rootCommentId },
      include: { post: { select: { authorId: true } } },
    });
    if (!rootComment) throw new NotFoundException('Root comment not found');

    const replies = await this.prisma.comment.findMany({
      where: {
        OR: [{ rootParentId: rootCommentId }, { parentId: rootCommentId }],
      },
      take: limit + 1,
      skip: after ? 1 : 0,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...(after ? { cursor: { id: after } } : {}),
      include: {
        user: { select: userSelect },
        replyToUser: { select: replyToUserSelect },
        likes: { select: { userId: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });

    const postAuthorId = rootComment.post?.authorId;

    return replies.map((r) => ({
      ...r,
      isLiked: Boolean(
        viewerId && Array.isArray(r.likes) && r.likes.some((l) => l.userId === viewerId),
      ),
      isLikedByAuthor: Boolean(
        postAuthorId && Array.isArray(r.likes) && r.likes.some((l) => l.userId === postAuthorId),
      ),
      likesCount: r._count?.likes ?? (Array.isArray(r.likes) ? r.likes.length : 0),
      replyCount: r._count?.replies ?? 0,
    }));
  }

  async toggleCommentLike(
    commentId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const existingLike = await this.prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existingLike) {
      await this.prisma.commentLike.delete({
        where: { commentId_userId: { commentId, userId } },
      });
      const count = await this.prisma.commentLike.count({ where: { commentId } });
      return { isLiked: false, likesCount: count };
    }

    await this.prisma.commentLike.create({
      data: { commentId, userId },
    });
    const count = await this.prisma.commentLike.count({ where: { commentId } });
    return { isLiked: true, likesCount: count };
  }

  async togglePinComment(commentId: string, userId: string): Promise<{ isPinned: boolean }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { authorId: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (!comment.post || comment.post.authorId !== userId) {
      throw new ForbiddenException('Only the post author can pin comments');
    }

    if (comment.parentId) {
      throw new ForbiddenException('Only root comments can be pinned');
    }

    const nextIsPinned = !comment.isPinned;

    if (nextIsPinned) {
      // Unpin any previous pinned comment on this post (limit 1)
      await this.prisma.comment.updateMany({
        where: { postId: comment.postId, isPinned: true },
        data: { isPinned: false },
      });
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: { isPinned: nextIsPinned },
    });

    return { isPinned: nextIsPinned };
  }

  async deleteComment(commentId: string, userId: string): Promise<CommentWithUser> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: { select: { authorId: true } },
        _count: { select: { replies: true, likes: true } },
        user: { select: userSelect },
        replyToUser: { select: replyToUserSelect },
        likes: { select: { userId: true } },
      },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.userId !== userId && comment.post?.authorId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own comments or comments on your posts',
      );
    }

    const hasReplies = (comment._count?.replies ?? 0) > 0;

    if (hasReplies) {
      // Tombstone soft-delete to preserve replies tree
      return this.prisma.comment.update({
        where: { id: commentId },
        data: {
          isDeleted: true,
          text: '[Comment deleted]',
          mediaUrl: null,
        },
        include: {
          user: { select: userSelect },
          replyToUser: { select: replyToUserSelect },
          likes: { select: { userId: true } },
          _count: { select: { likes: true, replies: true } },
        },
      });
    }

    return this.prisma.comment.delete({
      where: { id: commentId },
      include: {
        user: { select: userSelect },
        replyToUser: { select: replyToUserSelect },
        likes: { select: { userId: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });
  }

  async findRecentDuplicate(
    userId: string,
    postId: string,
    text: string,
    since: Date,
  ): Promise<boolean> {
    const duplicate = await this.prisma.comment.findFirst({
      where: {
        userId,
        postId,
        text: text.trim(),
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    return duplicate !== null;
  }

  async findPostBasic(postId: string) {
    return this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, author: { select: { username: true } } },
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

  async findUserBasic(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, avatar: true },
    });
  }

  async findMentionedUsers(usernames: string[], excludeUserId: string) {
    return this.prisma.user.findMany({
      where: {
        username: { in: usernames, mode: 'insensitive' },
        id: { not: excludeUserId },
      },
      select: { id: true, username: true },
    });
  }
}
