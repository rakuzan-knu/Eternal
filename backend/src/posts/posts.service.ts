import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { POSTS_REPOSITORY } from './interfaces/posts-repository.interface';
import type { IPostRepository } from './interfaces/posts-repository.interface';
import type { Paginated } from '../common/pagination';
import { paginate } from '../common/pagination';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PostsService {
  private static readonly CACHE_POST_PREFIX = 'posts:';
  private static readonly CACHE_FEED_PATTERN = 'posts:feed:*';

  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: IPostRepository,
    private readonly redis: RedisService,
  ) {}

  private getPostKey(id: string): string {
    return `${PostsService.CACHE_POST_PREFIX}${id}`;
  }

  private async invalidateFeedAndPost(postId?: string): Promise<void> {
    const tasks: Promise<void>[] = [this.redis.delByPattern(PostsService.CACHE_FEED_PATTERN)];
    if (postId) {
      tasks.push(this.redis.del(this.getPostKey(postId)));
    }
    await Promise.all(tasks);
  }

  async getAllPosts(
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<Paginated<PostResponseDto>> {
    if (viewerId) {
      const posts = await this.postsRepository.getAllPosts(limit, after, viewerId);
      return paginate(posts, limit, PostResponseDto.fromPrisma);
    }

    const key = `posts:feed:${limit}:${after ?? 'first'}`;
    return this.redis.getOrSet(key, 30, async () => {
      const posts = await this.postsRepository.getAllPosts(limit, after);
      return paginate(posts, limit, PostResponseDto.fromPrisma);
    });
  }

  async createPost(dto: CreatePostDto, authorId: string): Promise<PostResponseDto> {
    const post = await this.postsRepository.createPost({
      ...dto,
      author: { connect: { id: authorId } },
    });
    await this.invalidateFeedAndPost();
    return PostResponseDto.fromPrisma({ ...post, isFollowing: false });
  }

  async deletePost(id: string, userId: string): Promise<PostResponseDto> {
    const post = await this.postsRepository.getPostById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId)
      throw new ForbiddenException('You can only delete your own posts');

    const deleted = await this.postsRepository.deletePost(id);
    await this.invalidateFeedAndPost(id);
    return PostResponseDto.fromPrisma({ ...deleted, isFollowing: false });
  }

  async editPost(id: string, dto: EditPostDto, userId: string): Promise<PostResponseDto> {
    const post = await this.postsRepository.getPostById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can only edit your own posts');

    const edited = await this.postsRepository.editPost(id, dto);
    await this.invalidateFeedAndPost(id);
    return PostResponseDto.fromPrisma({ ...edited, isFollowing: false });
  }

  async getPostById(id: string, viewerId?: string): Promise<PostResponseDto> {
    if (viewerId) {
      const post = await this.postsRepository.getPostById(id, viewerId);
      if (!post) throw new NotFoundException('Post not found');
      return PostResponseDto.fromPrisma(post);
    }

    return this.redis.getOrSet(this.getPostKey(id), 30, async () => {
      const post = await this.postsRepository.getPostById(id);
      if (!post) throw new NotFoundException('Post not found');
      return PostResponseDto.fromPrisma(post);
    });
  }
}
