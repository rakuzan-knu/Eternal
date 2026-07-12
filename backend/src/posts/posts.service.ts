import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Post } from '@prisma/client';
import { CreatePostDto } from './dto/create-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { GetAllPostsResult } from './types/post.types';
import { POSTS_REPOSITORY } from './interfaces/posts-repository.interface';
import type { IPostRepository } from './interfaces/posts-repository.interface';
import { paginate } from '../common/pagination';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PostsService {
  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: IPostRepository,
    private readonly redis: RedisService,
  ) {}
  private postKey(id: string): string {
    return `posts:${id}`;
  }
  async getAllPosts(limit: number, after?: string): Promise<GetAllPostsResult> {
    const key = `posts:feed:${limit}:${after ?? 'first'}`;
    return this.redis.getOrSet(key, 30, async () => {
      const posts = await this.postsRepository.getAllPosts(limit, after);
      return paginate(posts, limit, (post) => post);
    });
  }

  async createPost(dto: CreatePostDto, authorId: string): Promise<Post> {
    return this.postsRepository.createPost({
      ...dto,
      author: {
        connect: { id: authorId },
      },
    });
  }
  async deletePost(id: string, userId: string): Promise<Post> {
    const post = await this.postsRepository.getPostById(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    const deleted = await this.postsRepository.deletePost(id);
    await this.redis.del(this.postKey(id));
    return deleted;
  }
  async editPost(id: string, dto: EditPostDto, userId: string): Promise<Post> {
    const post = await this.postsRepository.getPostById(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }
    const edited = await this.postsRepository.editPost(id, dto);
    await this.redis.del(this.postKey(id));
    return edited;
  }
  async getPostById(id: string): Promise<Post> {
    return this.redis.getOrSet(this.postKey(id), 30, async () => {
      const post = await this.postsRepository.getPostById(id);
      if (!post) {
        throw new NotFoundException('Post not found');
      }
      return post;
    });
  }
}
