import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ILikesRepository } from './likes-repository.interface';
import type { IPostRepository } from '../posts/posts-repository.interface';
import type { Like } from '@prisma/client';

@Injectable()
export class LikesService {
  constructor(
    @Inject('ILikesRepository')
    private readonly likesRepository: ILikesRepository,
    @Inject('IPostRepository')
    private readonly postsRepository: IPostRepository,
  ) {}

  async likePost(postId: string, userId: string): Promise<Like> {
    const post = await this.postsRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return this.likesRepository.createLike(postId, userId);
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    return this.likesRepository.deleteLike(postId, userId);
  }
}
