import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { type CreateCommentDto, CommentResponseDto } from '@common/contracts';
import { COMMENTS_REPOSITORY } from './interfaces/comments-repository.interface';
import type { ICommentsRepository } from './interfaces/comments-repository.interface';
import { GetAllCommentsResult } from './types/comments.types';
import { paginate } from '../common/pagination';
import { PrismaService } from '@common/prisma';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { WS_EVENTS } from '../messenger/events/ws-events';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENTS_REPOSITORY)
    private readonly commentsRepository: ICommentsRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessengerGateway))
    private readonly gateway: MessengerGateway,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async addComment(
    postId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    // 1. Idempotency Key Guard
    if (dto.clientMutationId && this.redis) {
      const lockKey = `idempotency:comment:${userId}:${dto.clientMutationId}`;
      try {
        const client = typeof this.redis.getClient === 'function' ? this.redis.getClient() : null;
        if (client) {
          const acquired = await client.set(lockKey, 'locked', 'EX', 30, 'NX');
          if (!acquired) {
            throw new ConflictException(
              'Duplicate mutation request in progress or already processed',
            );
          }
        }
      } catch (err) {
        if (err instanceof ConflictException) throw err;
        // Non-blocking fallback if redis error
      }
    }

    // 2. Anti-Spam: Mention Bombing Protection (Max 5 mentions)
    const rawMatches: string[] = dto.text.match(/@([a-zA-Z0-9._]{1,32})/g) ?? [];
    if (rawMatches.length > 5) {
      throw new BadRequestException('Maximum 5 mentions per comment allowed');
    }

    // 3. Anti-Spam: Duplicate Comment Guard (Same text within 60s)
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const duplicate = await this.prisma.comment.findFirst({
      where: {
        userId,
        text: dto.text.trim(),
        createdAt: { gte: sixtySecondsAgo },
      },
    });
    if (duplicate) {
      throw new ConflictException(
        'Duplicate comment detected. Please wait before posting identical text.',
      );
    }

    // 4. Post & Blocklist Permission Checks
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, author: { select: { username: true } } },
    });
    if (!post) throw new NotFoundException('Post not found');

    if (post.authorId !== userId) {
      const isBlocked = await this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: post.authorId, blockedId: userId },
            { blockerId: userId, blockedId: post.authorId },
          ],
        },
      });
      if (isBlocked) {
        throw new ForbiddenException('You cannot comment on this post due to block settings');
      }
    }

    if (dto.replyToUserId && dto.replyToUserId !== userId) {
      const isReplyBlocked = await this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: dto.replyToUserId, blockedId: userId },
            { blockerId: userId, blockedId: dto.replyToUserId },
          ],
        },
      });
      if (isReplyBlocked) {
        throw new ForbiddenException('You cannot reply to this user due to block settings');
      }
    }

    const comment = await this.commentsRepository.addComment(postId, userId, dto);

    // 5. Emit real-time notifications
    try {
      if (post.authorId !== userId) {
        const actor = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, displayName: true, avatar: true },
        });

        if (actor) {
          const preview = dto.text.trim();
          const commentBody = preview.length > 50 ? `${preview.slice(0, 50)}...` : preview;

          this.gateway.emitToUser(post.authorId, WS_EVENTS.SOCIAL_NOTIFICATION, {
            type: 'COMMENT',
            actor: {
              id: actor.id,
              username: actor.username,
              displayName: actor.displayName || actor.username,
              avatar: actor.avatar,
            },
            postId: post.id,
            authorUsername: post.author.username,
            commentText: dto.text,
            message: dto.parentId
              ? `replied to a comment on your post: "${commentBody}"`
              : `commented: "${commentBody}"`,
          });
        }
      }

      // Check mentions in comment text
      const trailingPunct = new Set(['.', '_', ',', '!', '?', ':', ';']);
      const cleanUsernames = Array.from(
        new Set(
          rawMatches
            .map((m: string): string => {
              const handle = m.startsWith('@') ? m.slice(1) : m;
              let start = 0;
              while (start < handle.length && (handle[start] === '.' || handle[start] === '_')) {
                start++;
              }
              let end = handle.length - 1;
              while (end >= start && trailingPunct.has(handle[end])) {
                end--;
              }
              return handle.slice(start, end + 1).toLowerCase();
            })
            .filter((u: string) => u.length >= 2 && u.length <= 30),
        ),
      );

      if (cleanUsernames.length > 0) {
        const cappedUsernames = cleanUsernames.slice(0, 5);
        const mentionedUsers = await this.prisma.user.findMany({
          where: {
            username: { in: cappedUsernames, mode: 'insensitive' },
            id: { not: userId },
          },
          select: { id: true, username: true },
        });

        const uniqueTargets = Array.from(new Map(mentionedUsers.map((u) => [u.id, u])).values());

        if (uniqueTargets.length > 0) {
          const actor = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, displayName: true, avatar: true },
          });

          if (actor) {
            const preview = dto.text.trim();
            const commentBody = preview.length > 50 ? `${preview.slice(0, 50)}...` : preview;
            for (const target of uniqueTargets) {
              if (target.id !== userId) {
                this.gateway.emitToUser(target.id, WS_EVENTS.SOCIAL_NOTIFICATION, {
                  type: 'MENTION',
                  actor: {
                    id: actor.id,
                    username: actor.username,
                    displayName: actor.displayName || actor.username,
                    avatar: actor.avatar,
                  },
                  postId: postId,
                  authorUsername: actor.username,
                  commentText: dto.text,
                  message: `mentioned you in a comment: "${commentBody}"`,
                });
              }
            }
          }
        }
      }
    } catch {
      // Non-blocking notification
    }

    return CommentResponseDto.fromPrisma(comment, userId, post.authorId);
  }

  async deleteComment(commentId: string, userId: string): Promise<CommentResponseDto> {
    const comment = await this.commentsRepository.deleteComment(commentId, userId);
    return CommentResponseDto.fromPrisma(comment, userId);
  }

  async getComments(
    postId: string,
    limit: number,
    cursor?: string,
    viewerId?: string,
  ): Promise<GetAllCommentsResult> {
    const comments = await this.commentsRepository.getCommentsByPostId(
      postId,
      limit,
      cursor,
      viewerId,
    );
    return paginate(comments, limit, (comment) => CommentResponseDto.fromPrisma(comment, viewerId));
  }

  async getReplies(
    rootCommentId: string,
    limit: number,
    cursor?: string,
    viewerId?: string,
  ): Promise<GetAllCommentsResult> {
    const replies = await this.commentsRepository.getRepliesByRootId(
      rootCommentId,
      limit,
      cursor,
      viewerId,
    );
    return paginate(replies, limit, (comment) => CommentResponseDto.fromPrisma(comment, viewerId));
  }

  async toggleCommentLike(
    commentId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    return this.commentsRepository.toggleCommentLike(commentId, userId);
  }

  async togglePinComment(commentId: string, userId: string): Promise<{ isPinned: boolean }> {
    return this.commentsRepository.togglePinComment(commentId, userId);
  }
}
