import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { LIKES_REPOSITORY } from './interfaces/likes-repository.interface';
import type { ILikesRepository } from './interfaces/likes-repository.interface';
import { POSTS_REPOSITORY } from '../posts/interfaces/posts-repository.interface';
import type { IPostRepository } from '../posts/interfaces/posts-repository.interface';
import { PrismaService } from '../prisma/prisma.service';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { WS_EVENTS } from '../messenger/events/ws-events';
import { Like, Prisma } from '@prisma/client';

@Injectable()
export class LikesService {
  constructor(
    @Inject(LIKES_REPOSITORY)
    private readonly likesRepository: ILikesRepository,
    @Inject(forwardRef(() => POSTS_REPOSITORY))
    private readonly postsRepository: IPostRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessengerGateway))
    private readonly gateway: MessengerGateway,
  ) {}

  async likePost(postId: string, userId: string): Promise<Like> {
    const post = await this.postsRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    try {
      const like = await this.likesRepository.createLike(postId, userId);

      // Emit real-time notification to post author
      try {
        if (post.authorId !== userId) {
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
        }
      } catch {
        // Non-blocking notification
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
