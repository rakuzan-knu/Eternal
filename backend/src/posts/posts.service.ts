import {
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type CreatePostDto, type EditPostDto, PostResponseDto } from '@common/contracts';
import { POSTS_REPOSITORY } from './interfaces/posts-repository.interface';
import type { IPostRepository } from './interfaces/posts-repository.interface';
import type { Paginated } from '../common/pagination';
import { paginate } from '../common/pagination';
import { RedisService } from '../redis/redis.service';
import { PostsMediaService, type ProcessedMedia } from './posts-media.service';
import { PrismaService } from '@common/prisma';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { WS_EVENTS } from '../messenger/events/ws-events';
import { MediaType, NotificationType, type ReportCategory } from '@prisma/client';
import {
  CreateNotificationEvent,
  NOTIFICATION_EVENTS,
} from '../notifications/events/notification.events';

@Injectable()
export class PostsService {
  private static readonly CACHE_POST_PREFIX = 'posts:';
  private static readonly CACHE_FEED_PATTERN = 'posts:feed:*';

  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: IPostRepository,
    private readonly mediaService: PostsMediaService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessengerGateway))
    @Optional()
    private readonly gateway?: MessengerGateway,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  private getPostKey(id: string): string {
    return `${PostsService.CACHE_POST_PREFIX}${id}`;
  }

  private async invalidateFeedAndPost(postId?: string): Promise<void> {
    try {
      const tasks: Promise<void>[] = [this.redis.delByPattern(PostsService.CACHE_FEED_PATTERN)];
      if (postId) {
        tasks.push(this.redis.del(this.getPostKey(postId)));
      }
      await Promise.all(tasks);
    } catch {
      // Non-blocking cache invalidation
    }
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
      dto.media.forEach(
        (
          item: { type: MediaType; url: string; poster?: string; order?: number },
          index: number,
        ) => {
          mediaItems.push({
            type: item.type,
            url: item.url,
            poster: item.poster,
            order: item.order ?? index,
          });
        },
      );
    }

    if (dto.gifUrls && dto.gifUrls.length > 0) {
      dto.gifUrls.forEach((gifUrl: string, index: number) => {
        if (typeof gifUrl === 'string' && gifUrl.trim()) {
          mediaItems.push({
            type: MediaType.IMAGE,
            url: gifUrl.trim(),
            order: mediaItems.length + index,
          });
        }
      });
    }

    if (files && files.length > 0) {
      try {
        const processed = await this.mediaService.processUploadedFiles(files);
        processed.forEach((item: ProcessedMedia) => mediaItems.push(item));
      } catch {
        // Fallback: if files exist, don't crash the entire post if upload fails
        // but log and proceed
      }
    }

    const contentText = (dto.content ?? '').trim();

    const post = await this.postsRepository.createPost({
      content: contentText,
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

    // If poll options were provided, create the poll
    if (dto.poll && Array.isArray(dto.poll) && dto.poll.length >= 2) {
      try {
        const validOptions = dto.poll.map((opt: string) => String(opt).trim()).filter(Boolean);
        if (validOptions.length >= 2) {
          const pollTitle = contentText.length > 0 ? contentText.slice(0, 100) : 'Poll';
          const createdPoll = await this.prisma.poll.create({
            data: {
              authorId,
              postId: post.id,
              title: pollTitle,
              options: {
                createMany: {
                  data: validOptions.map((text: string, index: number) => ({
                    optionText: text,
                    sortOrder: index,
                  })),
                },
              },
            },
            include: {
              options: { orderBy: { sortOrder: 'asc' } },
              votes: true,
            },
          });
          post.poll = createdPoll;
        }
      } catch {
        // Non-blocking poll creation failure
      }
    }

    // Check mentions in content and emit notifications
    try {
      if (contentText.length > 0) {
        const rawMatches: string[] = contentText.match(/@([a-zA-Z0-9._]{1,32})/g) ?? [];
        const trailingPunct = new Set(['.', '_', ',', '!', '?', ':', ';']);
        const cleanUsernames = Array.from(
          new Set(
            rawMatches
              .map((m: string): string => {
                const handle = m.startsWith('@') ? m.slice(1) : m;
                let start = 0;
                while (start < handle.length && (handle[start] === '.' || handle[start] === '_')) {
                  start++;
                }
                let end = handle.length - 1;
                while (end >= start && trailingPunct.has(handle[end])) {
                  end--;
                }
                return handle.slice(start, end + 1).toLowerCase();
              })
              .filter((u: string) => u.length >= 2 && u.length <= 30),
          ),
        );

        if (cleanUsernames.length > 0) {
          // Cap to at most 10 mentions to prevent notification spam
          const cappedUsernames = cleanUsernames.slice(0, 10);
          const mentionedUsers = await this.prisma.user.findMany({
            where: {
              username: { in: cappedUsernames, mode: 'insensitive' },
              id: { not: authorId }, // Exclude self-mentions
            },
            select: { id: true, username: true },
          });

          // Deduplicate target users
          const uniqueTargets = Array.from(
            new Map(
              mentionedUsers.map((u: { id: string; username: string }) => [u.id, u]),
            ).values(),
          );

          if (uniqueTargets.length > 0) {
            if (this.eventEmitter) {
              for (const target of uniqueTargets) {
                if (target.id !== authorId) {
                  this.eventEmitter.emit(
                    NOTIFICATION_EVENTS.CREATE,
                    new CreateNotificationEvent(target.id, NotificationType.MENTION, {
                      actorId: authorId,
                      postId: post.id,
                      text: contentText,
                    }),
                  );
                }
              }
            }
            if (this.gateway) {
              const actor = await this.prisma.user.findUnique({
                where: { id: authorId },
                select: { id: true, username: true, displayName: true, avatar: true },
              });
              if (actor) {
                const preview = contentText;
                const postBody = preview.length > 60 ? `${preview.slice(0, 60)}...` : preview;
                for (const target of uniqueTargets) {
                  if (target.id !== authorId) {
                    this.gateway.emitToUser(target.id, WS_EVENTS.SOCIAL_NOTIFICATION, {
                      type: 'MENTION',
                      actor: {
                        id: actor.id,
                        username: actor.username,
                        displayName: actor.displayName || actor.username,
                        avatar: actor.avatar,
                      },
                      postId: post.id,
                      authorUsername: actor.username,
                      message: `mentioned you in a post: "${postBody}"`,
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      // Non-blocking notification emission
    }

    await this.invalidateFeedAndPost();
    return PostResponseDto.fromPrisma(post);
  }

  async searchPosts(
    query: string,
    limit: number,
    after?: string,
    viewerId?: string,
    mediaOnly?: boolean,
  ): Promise<Paginated<PostResponseDto>> {
    const posts = await this.postsRepository.searchPosts(query, limit, after, viewerId, mediaOnly);
    return paginate(posts, limit, PostResponseDto.fromPrisma);
  }

  async getExplorePosts(
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<Paginated<PostResponseDto>> {
    const posts = await this.postsRepository.getExploreMediaPosts(limit, after, viewerId);
    return paginate(posts, limit, PostResponseDto.fromPrisma);
  }

  async getPostsByHashtag(
    hashtag: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<Paginated<PostResponseDto> & { totalCount: number }> {
    const { posts, totalCount } = await this.postsRepository.getPostsByHashtag(
      hashtag,
      limit,
      after,
      viewerId,
    );
    const paginated = paginate(posts, limit, PostResponseDto.fromPrisma);
    return {
      ...paginated,
      totalCount,
    };
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

    // Emit asynchronous notification event to post author
    if (post.authorId !== userId) {
      if (this.eventEmitter) {
        this.eventEmitter.emit(
          NOTIFICATION_EVENTS.CREATE,
          new CreateNotificationEvent(post.authorId, NotificationType.REPOST, {
            actorId: userId,
            postId: post.id,
          }),
        );
      }
      if (this.gateway) {
        try {
          const [actor, author] = await Promise.all([
            this.prisma.user.findUnique({
              where: { id: userId },
              select: { id: true, username: true, displayName: true, avatar: true },
            }),
            this.prisma.user.findUnique({
              where: { id: post.authorId },
              select: { username: true },
            }),
          ]);
          if (actor) {
            this.gateway.emitToUser(post.authorId, WS_EVENTS.SOCIAL_NOTIFICATION, {
              type: 'REPOST',
              actor: {
                id: actor.id,
                username: actor.username,
                displayName: actor.displayName || actor.username,
                avatar: actor.avatar,
              },
              postId: post.id,
              authorUsername: author?.username || '',
              message: 'reposted your post',
            });
          }
        } catch {
          // Non-blocking
        }
      }
    }

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
    const pinnedPostId = await this.redis.get(`user:pinned_post:${userId}`);
    const posts = await this.postsRepository.getPostsByUserId(userId, limit, after, viewerId);

    const mapped = posts.map((p) => ({
      ...p,
      isPinned: p.id === pinnedPostId,
      pinnedAt: p.id === pinnedPostId ? p.createdAt : undefined,
    }));

    if (!after && pinnedPostId) {
      const idx = mapped.findIndex((p) => p.id === pinnedPostId);
      if (idx > 0) {
        const [pinned] = mapped.splice(idx, 1);
        mapped.unshift(pinned);
      }
    }

    return paginate(mapped, limit, PostResponseDto.fromPrisma);
  }

  async pinPost(postId: string, userId: string): Promise<PostResponseDto> {
    const post = await this.postsRepository.getPostById(postId, userId);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only pin your own posts');
    }

    const pinnedKey = `user:pinned_post:${userId}`;
    await this.redis.set(pinnedKey, postId, 86400 * 365);
    await this.invalidateFeedAndPost(postId);

    return PostResponseDto.fromPrisma({
      ...post,
      isPinned: true,
      pinnedAt: new Date(),
    });
  }

  async unpinPost(postId: string, userId: string): Promise<PostResponseDto> {
    const post = await this.postsRepository.getPostById(postId, userId);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only unpin your own posts');
    }

    const pinnedKey = `user:pinned_post:${userId}`;
    const current = await this.redis.get(pinnedKey);
    if (current === postId) {
      await this.redis.del(pinnedKey);
    }
    await this.invalidateFeedAndPost(postId);

    return PostResponseDto.fromPrisma({
      ...post,
      isPinned: false,
      pinnedAt: null,
    });
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

  async sharePost(
    postId: string,
    userId?: string,
  ): Promise<{ success: true; incremented: boolean }> {
    if (userId) {
      const shareKey = `post:shares:${postId}:${userId}`;
      const alreadyShared = await this.redis.get(shareKey);
      if (alreadyShared) {
        return { success: true, incremented: false };
      }
      await this.redis.set(shareKey, '1', 60 * 60 * 24 * 30);
    }
    await this.postsRepository.incrementShareCount(postId);
    await this.invalidateFeedAndPost(postId);
    return { success: true, incremented: true };
  }

  async getPostOgHtml(postId: string): Promise<string> {
    const post = await this.postsRepository.getPostById(postId);
    if (!post) {
      return `<!DOCTYPE html><html><head><title>Post Not Found</title></head><body><h1>Post not found</h1></body></html>`;
    }

    const authorName = post.author?.displayName || post.author?.username || 'User';
    const authorHandle = post.author?.username || 'user';
    const title = `${authorName} (@${authorHandle}) on Eternal`;
    const description = post.content
      ? post.content.length > 200
        ? post.content.slice(0, 197) + '...'
        : post.content
      : `Check out ${authorName}'s post on Eternal`;
    const image = post.media?.[0]?.url || post.author?.avatar || '/favicon.svg';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description.replace(/"/g, '&quot;')}" />
  <meta property="og:site_name" content="Eternal Social Network" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
  <meta property="og:image" content="${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${image}" alt="Post Preview" />
</body>
</html>`;
  }

  async votePoll(
    postId: string,
    optionId: string,
    userId: string,
  ): Promise<{ success: boolean; poll: unknown }> {
    const poll = await this.prisma.poll.findUnique({
      where: { postId },
      include: { options: true, votes: true },
    });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    if (!poll.isActive) {
      throw new GoneException('Poll is no longer active');
    }

    const option = poll.options.find((o: { id: string }) => o.id === optionId);
    if (!option) {
      throw new NotFoundException('Poll option not found');
    }

    const existingVote = poll.votes.find(
      (v: { userId: string; id: string; optionId: string }) => v.userId === userId,
    );

    if (existingVote) {
      if (existingVote.optionId === optionId) {
        return { success: true, poll };
      }
      await this.prisma.$transaction([
        this.prisma.vote.update({
          where: { id: existingVote.id },
          data: { optionId },
        }),
        this.prisma.pollOption.update({
          where: { id: existingVote.optionId },
          data: { votesCount: { decrement: 1 } },
        }),
        this.prisma.pollOption.update({
          where: { id: optionId },
          data: { votesCount: { increment: 1 } },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.vote.create({
          data: {
            pollId: poll.id,
            optionId,
            userId,
          },
        }),
        this.prisma.pollOption.update({
          where: { id: optionId },
          data: { votesCount: { increment: 1 } },
        }),
      ]);
    }

    await this.invalidateFeedAndPost(postId);
    return { success: true, poll };
  }

  async getPollVoters(postId: string, _userId?: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { postId },
      include: {
        options: true,
        votes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    return poll.options.map((opt: { id: string }) => ({
      optionId: opt.id,
      voters: poll.votes
        .filter((v: { optionId: string }) => v.optionId === opt.id)
        .map(
          (v: {
            user: {
              id: string;
              username: string;
              displayName?: string | null;
              avatar?: string | null;
            };
          }) => ({
            id: v.user.id,
            username: v.user.username,
            displayName: v.user.displayName || v.user.username,
            avatar: v.user.avatar,
          }),
        ),
    }));
  }

  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    file: Express.Multer.File,
  ) {
    return await this.mediaService.uploadChunk(uploadId, chunkIndex, totalChunks, file);
  }

  getChunkStatus(uploadId: string) {
    return this.mediaService.getChunkStatus(uploadId);
  }
}
