import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LIKES_REPOSITORY } from './interfaces/likes-repository.interface';
import type { ILikesRepository } from './interfaces/likes-repository.interface';
import { POSTS_REPOSITORY } from '../posts/interfaces/posts-repository.interface';
import type { IPostRepository } from '../posts/interfaces/posts-repository.interface';
import { PrismaService } from '@common/prisma';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { WS_EVENTS } from '../messenger/events/ws-events';
import { Like, NotificationType, Prisma } from '@prisma/client';
import {
  CreateNotificationEvent,
  NOTIFICATION_EVENTS,
} from '../notifications/events/notification.events';

@Injectable()
export class LikesService {
  constructor(
    @Inject(LIKES_REPOSITORY)
    private readonly likesRepository: ILikesRepository,
    @Inject(forwardRef(() => POSTS_REPOSITORY))
    private readonly postsRepository: IPostRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessengerGateway))
    @Optional()
    private readonly gateway?: MessengerGateway,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  async likePost(postId: string, userId: string): Promise<Like> {
    const post = await this.postsRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    try {
      const like = await this.likesRepository.createLike(postId, userId);

      // Emit asynchronous notification event to post author
      if (post.authorId !== userId) {
        if (this.eventEmitter) {
          this.eventEmitter.emit(
            NOTIFICATION_EVENTS.CREATE,
            new CreateNotificationEvent(post.authorId, NotificationType.LIKE_POST, {
              actorId: userId,
              postId: post.id,
            }),
          );
        }
        if (this.gateway) {
          try {
            const [actor, author] = await Promise.all([
              this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true, displayName: true, avatar: true },
              }),
              this.prisma.user.findUnique({
                where: { id: post.authorId },
                select: { username: true },
              }),
            ]);
            if (actor) {
              this.gateway.emitToUser(post.authorId, WS_EVENTS.SOCIAL_NOTIFICATION, {
                type: 'LIKE',
                actor: {
                  id: actor.id,
                  username: actor.username,
                  displayName: actor.displayName || actor.username,
                  avatar: actor.avatar,
                },
                postId: post.id,
                authorUsername: author?.username || '',
                message: 'liked your post',
              });
            }
          } catch {
            // Non-blocking
          }
        }
      }

      return like;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Post already liked');
      }
      throw e;
    }
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    try {
      await this.likesRepository.deleteLike(postId, userId);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Like not found');
      }
      throw e;
    }
  }
}
