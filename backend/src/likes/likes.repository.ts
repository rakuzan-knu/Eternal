import { Injectable } from '@nestjs/common';
import type { ILikesRepository } from './interfaces/likes-repository.interface';
import { PrismaService } from '@common/prisma';
import type { Like } from '@prisma/client';

@Injectable()
export class LikesRepository implements ILikesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createLike(postId: string, userId: string): Promise<Like> {
    return await this.prismaService.like.create({
      data: {
        postId,
        userId,
      },
    });
  }

  async deleteLike(postId: string, userId: string): Promise<void> {
    await this.prismaService.like.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });
  }
}
