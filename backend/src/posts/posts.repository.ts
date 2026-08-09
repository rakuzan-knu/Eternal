import { Injectable } from '@nestjs/common';
import { IPostRepository } from './interfaces/posts-repository.interface';
import { PrismaService } from '../prisma/prisma.service';
import { Post, Prisma } from '@prisma/client';
import type { PostWithFollowing } from './dto/post-response.dto';

@Injectable()
export class PostsRepository implements IPostRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAllPosts(
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<PostWithFollowing[]> {
    const posts = await this.prisma.post.findMany({
      take: limit + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: viewerId
        ? {
            author: {
              select: {
                followers: {
                  where: { followerId: viewerId },
                  select: { id: true },
                  take: 1,
                },
              },
            },
          }
        : undefined,
    });

    return posts.map((post) => this.mapToPostWithFollowing(post, viewerId));
  }

  async getPostById(id: string, viewerId?: string): Promise<PostWithFollowing | null> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: viewerId
        ? {
            author: {
              select: {
                followers: {
                  where: { followerId: viewerId },
                  select: { id: true },
                  take: 1,
                },
              },
            },
          }
        : undefined,
    });

    if (!post) return null;
    return this.mapToPostWithFollowing(post, viewerId);
  }

  async createPost(data: Prisma.PostCreateInput): Promise<Post> {
    return this.prisma.post.create({ data });
  }

  async editPost(id: string, data: Prisma.PostUpdateInput): Promise<Post> {
    return this.prisma.post.update({ where: { id }, data });
  }

  async deletePost(id: string): Promise<Post> {
    return this.prisma.post.delete({ where: { id } });
  }

  private mapToPostWithFollowing(
    post: Post & { author?: { followers: { id: string }[] } | null },
    viewerId?: string,
  ): PostWithFollowing {
    const isFollowing = viewerId != null ? (post.author?.followers?.length ?? 0) > 0 : false;

    const { ...rest } = post;
    return { ...rest, isFollowing };
  }
}
