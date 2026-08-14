import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { COMMENTS_REPOSITORY } from './interfaces/comments-repository.interface';
import type { ICommentsRepository } from './interfaces/comments-repository.interface';
import { CommentResponseDto } from './dto/comment-response.dto';
import { GetAllCommentsResult } from './types/comments.types';
import { paginate } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
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
