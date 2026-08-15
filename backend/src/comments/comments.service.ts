import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { type CreateCommentDto, CommentResponseDto } from '@common/contracts';
import { COMMENTS_REPOSITORY } from './interfaces/comments-repository.interface';
import type { ICommentsRepository } from './interfaces/comments-repository.interface';
import { GetAllCommentsResult } from './types/comments.types';
import { paginate } from '../common/pagination';
import { PrismaService } from '@common/prisma';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { WS_EVENTS } from '../messenger/events/ws-events';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENTS_REPOSITORY)
    private readonly commentsRepository: ICommentsRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessengerGateway))
    private readonly gateway: MessengerGateway,
  ) {}

  async addComment(
    postId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsRepository.addComment(postId, userId, dto);

    // Emit real-time notification to post author
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: { author: true },
      });

      if (post && post.authorId !== userId) {
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
            message: `commented: "${commentBody}"`,
          });
        }
      }

      // Check mentions in comment text
      const rawMatches: string[] = dto.text.match(/@([a-zA-Z0-9._]{1,32})/g) ?? [];
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
        const cappedUsernames = cleanUsernames.slice(0, 10);
        const mentionedUsers = await this.prisma.user.findMany({
          where: {
            username: { in: cappedUsernames, mode: 'insensitive' },
            id: { not: userId }, // Exclude self-mentions
          },
          select: { id: true, username: true },
        });

        // Deduplicate target users
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

    return CommentResponseDto.fromPrisma(comment);
  }

  async deleteComment(commentId: string, userId: string): Promise<CommentResponseDto> {
    const comment = await this.commentsRepository.deleteComment(commentId, userId);
    return CommentResponseDto.fromPrisma(comment);
  }

  async getComments(postId: string, limit: number, cursor?: string): Promise<GetAllCommentsResult> {
    const comments = await this.commentsRepository.getCommentsByPostId(postId, limit, cursor);
    return paginate(comments, limit, (comment) => CommentResponseDto.fromPrisma(comment));
  }
}
