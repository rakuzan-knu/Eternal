import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LIKES_REPOSITORY } from './interfaces/likes-repository.interface';
import type { ILikesRepository } from './interfaces/likes-repository.interface';
import { POSTS_REPOSITORY } from '../posts/interfaces/posts-repository.interface';
import type { IPostRepository } from '../posts/interfaces/posts-repository.interface';
import { Like, Prisma } from '@prisma/client';

@Injectable()
export class LikesService {
  constructor(
    @Inject(LIKES_REPOSITORY)
    private readonly likesRepository: ILikesRepository,
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: IPostRepository,
  ) {}

  async likePost(postId: string, userId: string): Promise<Like> {
    const post = await this.postsRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    try {
      return await this.likesRepository.createLike(postId, userId);
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
