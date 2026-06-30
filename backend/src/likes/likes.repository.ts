import { Injectable } from '@nestjs/common';
import { ILikesRepository } from './likes-repository.interface';
import { PrismaService } from '../prisma/prisma.service';
import { Like } from '@prisma/client';

@Injectable()
export class LikesRepository implements ILikesRepository {
  constructor(private readonly prismaService: PrismaService) {}
  async createLike(postId: string, userId: string): Promise<Like> {
    return this.prismaService.like.create({
      data:{
        postId,
        userId,
      },
    });
  }
  async deleteLike(postId: string, userId: string): Promise<void> {
    this.prismaService.like.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });
  }
}
