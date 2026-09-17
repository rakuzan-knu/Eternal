import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LIKES_REPOSITORY } from './interfaces/likes-repository.interface';
import type { ILikesRepository } from './interfaces/likes-repository.interface';
import { POSTS_REPOSITORY } from '../posts/interfaces/posts-repository.interface';
import type { IPostRepository } from '../posts/interfaces/posts-repository.interface';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { WS_EVENTS } from '../messenger/events/ws-events';
import { Like, NotificationType, Prisma } from '@prisma/client';
import {
  CreateNotificationEvent,
  NOTIFICATION_EVENTS,
} from '../notifications/events/notification.events';
import { CrdtRegistryService } from '../common/crdt/crdt-registry.service';
import { makeUserBasic, makeSocialNotification } from '../common/v8/shape-stable';

@Injectable()
export class LikesService {
  private readonly logger = new Logger(LikesService.name);

  constructor(
    @Inject(LIKES_REPOSITORY)
    private readonly likesRepository: ILikesRepository,
    @Inject(forwardRef(() => POSTS_REPOSITORY))
    private readonly postsRepository: IPostRepository,
    @Inject(forwardRef(() => MessengerGateway))
    @Optional()
    private readonly gateway?: MessengerGateway,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
    @Optional()
    private readonly crdtRegistry?: CrdtRegistryService,
  ) {}

  async likePost(postId: string, userId: string): Promise<Like> {
    const post = await this.postsRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    try {
      const like = await this.likesRepository.createLike(postId, userId);

      // Increment PN-Counter in memory (O(1), zero DB lock)
      // Flushed to Redis asynchronously by the background flush loop
      if (this.crdtRegistry) {
        this.crdtRegistry.getPNCounter(`likes:${postId}`).increment();
      }

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
              this.postsRepository.findUserBasic(userId),
              this.postsRepository.findUserBasic(post.authorId),
            ]);
            if (actor) {
              // Shape-stable payload — same hidden class on every call
              const actorShape = makeUserBasic(
                actor.id,
                actor.username,
                actor.displayName,
                actor.avatar,
              );
              const notification = makeSocialNotification(
                'LIKE',
                actorShape,
                post.id,
                author?.username ?? '',
                'liked your post',
              );
              this.gateway.emitToUser(post.authorId, WS_EVENTS.SOCIAL_NOTIFICATION, notification);
            }
          } catch (e) {
            this.logger.warn(
              `Failed to emit real-time like notification for post ${postId}: ${String(e)}`,
            );
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

      // Decrement PN-Counter in memory (O(1), zero DB lock)
      if (this.crdtRegistry) {
        this.crdtRegistry.getPNCounter(`likes:${postId}`).decrement();
      }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Like not found');
      }
      throw e;
    }
  }
}
