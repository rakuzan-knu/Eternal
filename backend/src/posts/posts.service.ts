import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { POSTS_REPOSITORY } from './interfaces/posts-repository.interface';
import type { IPostRepository } from './interfaces/posts-repository.interface';
import type { Paginated } from '../common/pagination';
import { paginate } from '../common/pagination';
import { RedisService } from '../redis/redis.service';
import { PostsMediaService } from './posts-media.service';
import { MediaType, type ReportCategory } from '@prisma/client';

@Injectable()
export class PostsService {
  private static readonly CACHE_POST_PREFIX = 'posts:';
  private static readonly CACHE_FEED_PATTERN = 'posts:feed:*';

  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: IPostRepository,
    private readonly mediaService: PostsMediaService,
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

  async createPost(
    dto: CreatePostDto,
    authorId: string,
    files?: Express.Multer.File[],
  ): Promise<PostResponseDto> {
    const mediaItems: { type: MediaType; url: string; poster?: string; order: number }[] = [];

    if (dto.media && dto.media.length > 0) {
      dto.media.forEach((item, index) => {
        mediaItems.push({
          type: item.type,
          url: item.url,
          poster: item.poster,
          order: item.order ?? index,
        });
      });
    }

    if (files && files.length > 0) {
      const processed = await this.mediaService.processUploadedFiles(files);
      processed.forEach((item) => mediaItems.push(item));
    }

    const post = await this.postsRepository.createPost({
      content: dto.content,
      author: { connect: { id: authorId } },
      media:
        mediaItems.length > 0
          ? {
              create: mediaItems.map((m) => ({
                type: m.type,
                url: m.url,
                poster: m.poster,
                order: m.order,
              })),
            }
          : undefined,
    });

    await this.invalidateFeedAndPost();
    return PostResponseDto.fromPrisma(post);
  }

  async editPost(id: string, dto: EditPostDto, userId: string): Promise<PostResponseDto> {
    const post = await this.postsRepository.getPostById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can only edit your own posts');

    const edited = await this.postsRepository.editPost(id, dto);
    await this.invalidateFeedAndPost(id);
    return PostResponseDto.fromPrisma(edited);
  }

  async deletePost(id: string, userId: string): Promise<PostResponseDto> {
    const post = await this.postsRepository.getPostById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId)
      throw new ForbiddenException('You can only delete your own posts');

    const deleted = await this.postsRepository.deletePost(id);
    await this.invalidateFeedAndPost(id);
    return PostResponseDto.fromPrisma({
      ...deleted,
      authorId: deleted.authorId,
      isFollowing: false,
      isSaved: false,
      isReposted: false,
    });
  }

  async savePost(postId: string, userId: string): Promise<{ success: true }> {
    const post = await this.postsRepository.getPostById(postId);
    if (!post) throw new NotFoundException('Post not found');

    await this.postsRepository.savePost(postId, userId);
    await this.invalidateFeedAndPost(postId);
    return { success: true };
  }

  async unsavePost(postId: string, userId: string): Promise<{ success: true }> {
    await this.postsRepository.unsavePost(postId, userId);
    await this.invalidateFeedAndPost(postId);
    return { success: true };
  }

  async getSavedPosts(
    userId: string,
    limit: number,
    after?: string,
  ): Promise<Paginated<PostResponseDto>> {
    const posts = await this.postsRepository.getSavedPostsByUserId(userId, limit, after);
    return paginate(posts, limit, PostResponseDto.fromPrisma);
  }

  async repost(postId: string, userId: string): Promise<{ success: true }> {
    const post = await this.postsRepository.getPostById(postId);
    if (!post) throw new NotFoundException('Post not found');

    await this.postsRepository.repost(postId, userId);
    await this.invalidateFeedAndPost(postId);
    return { success: true };
  }

  async unrepost(postId: string, userId: string): Promise<{ success: true }> {
    await this.postsRepository.unrepost(postId, userId);
    await this.invalidateFeedAndPost(postId);
    return { success: true };
  }

  async getUserPosts(
    userId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<Paginated<PostResponseDto>> {
    const posts = await this.postsRepository.getPostsByUserId(userId, limit, after, viewerId);
    return paginate(posts, limit, PostResponseDto.fromPrisma);
  }

  async getUserReposts(
    userId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<Paginated<PostResponseDto>> {
    const posts = await this.postsRepository.getRepostsByUserId(userId, limit, after, viewerId);
    return paginate(posts, limit, PostResponseDto.fromPrisma);
  }

  async reportPost(
    postId: string,
    reporterId: string,
    category: ReportCategory,
    details?: string,
  ): Promise<{ id: string; status: 'queued' }> {
    const report = await this.postsRepository.reportPost(postId, reporterId, category, details);
    return { id: report.id, status: 'queued' };
  }
}
