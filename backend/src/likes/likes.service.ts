import { Inject } from '@nestjs/common';
import { ILikesRepository } from './likes-repository.interface';
import { IPostRepository } from '../posts/posts-repository.interface';
import { PrismaService } from '../prisma/prisma.service';

export class LikesService {
  constructor(
    @Inject('ILikesRepository')
    private readonly prisma: PrismaService,
    @Inject('ILikesRepository')
    private readonly likesRepository: ILikesRepository,
    @Inject('IPostRepository')
    private readonly postsRepository: IPostRepository,
  ) {}

  async likePost(postId: string, userId: string) {
    return this.likesRepository.createLike(postId, userId);
  }

  async unlikePost(postId: string, userId: string) {
    return this.likesRepository.deleteLike(postId, userId);
  }
}
