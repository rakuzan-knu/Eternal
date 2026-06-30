import { Injectable } from '@nestjs/common';
import { IPostRepository } from './posts-repository.interface';
import { PrismaService } from '../prisma/prisma.service';
import { Post, Prisma } from '@prisma/client';

@Injectable()
export class PostsRepository implements IPostRepository {
  constructor(private readonly prisma: PrismaService) {}
  async getAllPosts(limit: number, after?: string): Promise<Post[]> {
    return this.prisma.post.findMany({
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
  async getPostById(id: string): Promise<Post | null> {
    return this.prisma.post.findUnique({
      where: { id },
    });
  }
  async createPost(data: Prisma.PostCreateInput): Promise<Post> {
    return this.prisma.post.create({
      data,
    });
  }
  async editPost(id: string, data: Prisma.PostUpdateInput) {
    return this.prisma.post.update({
      where: { id },
      data,
    });
  }

  async deletePost(id: string): Promise<Post> {
    return this.prisma.post.delete({
      where: { id },
    });
  }
}
