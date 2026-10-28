import { DirectUploadsService } from '../common/media/direct-uploads.service';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import { uid } from 'uid';
import {
  type CreateReelDto,
  type ReelCommentResponseDto,
  type ReelResponseDto,
} from '../common/contracts/reels';
import {
  type IReelsRepository,
  type ReelCommentWithUser,
  type ReelWithAuthor,
  type ReelsFeedExclusions,
  REELS_REPOSITORY,
} from './interfaces/reels-repository.interface';
import { REELS_S3_CLIENT } from './s3-provider';
import { RedisService } from '../redis/redis.service';
import { QueueService } from '../queue/queue.service';
import { uploadToStorageWithFallback } from '../common/media/image-processor';
import { optimizeMp4FastStart, optimizeVideoThumbnail } from '../common/media/video-optimizer';
import { paginate, type Paginated } from '../common/pagination';

@Injectable()
export class ReelsService {
  @Inject(DirectUploadsService)
  private readonly directUploads!: DirectUploadsService;

  private readonly logger = new Logger(ReelsService.name);
  private static readonly FEED_CACHE_PREFIX = 'reels:feed:';
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @Inject(REELS_REPOSITORY)
    private readonly reelsRepository: IReelsRepository,
    @Inject(REELS_S3_CLIENT)
    private readonly s3: S3Client,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    @Optional()
    private readonly queueService?: QueueService,
  ) {
    this.bucket =
      this.configService.get<string>('R2_BUCKET') ??
      this.configService.get<string>('MINIO_BUCKET', 'posts');
    this.publicUrl =
      this.configService.get<string>('R2_PUBLIC_URL') ??
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';
  }

  private mapToDto(reel: ReelWithAuthor, viewerId?: string): ReelResponseDto {
    const isLiked = viewerId && reel.likes ? reel.likes.length > 0 : false;
    const isFollowing =
      viewerId && reel.author.followers ? reel.author.followers.length > 0 : false;
    return {
      id: reel.id,
      authorId: reel.authorId,
      caption: reel.caption,
      videoUrl: reel.videoUrl,
      hlsUrl: reel.hlsUrl,
      thumbnailUrl: reel.thumbnailUrl,
      blurhash: reel.blurhash,
      thumbhash: reel.thumbhash,
      duration: reel.duration,
      width: reel.width,
      height: reel.height,
      audioTitle: reel.audioTitle,
      audioArtist: reel.audioArtist,
      audioUrl: reel.audioUrl,
      viewsCount: reel.viewsCount,
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      sharesCount: reel.sharesCount,
      isLiked,
      isSaved: Boolean(viewerId && reel.saves?.length),
      savedCount: reel._count?.saves ?? 0,
      createdAt: reel.createdAt.toISOString(),
      author: {
        id: reel.author.id,
        username: reel.author.username,
        displayName: reel.author.displayName,
        avatar: reel.author.avatar,
        activeDecoration: reel.author.activeDecoration ?? null,
        isVerified: reel.author.isVerified,
        isFollowing,
      },
    };
  }

  private mapCommentToDto(comment: ReelCommentWithUser): ReelCommentResponseDto {
    return {
      id: comment.id,
      reelId: comment.reelId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: {
        id: comment.user.id,
        username: comment.user.username,
        displayName: comment.user.displayName,
        avatar: comment.user.avatar,
        activeDecoration: comment.user.activeDecoration ?? null,
        isVerified: comment.user.isVerified,
      },
    };
  }

  private async invalidateFeedCache(): Promise<void> {
    try {
      await this.redis.delByPattern(`${ReelsService.FEED_CACHE_PREFIX}*`);
    } catch (e) {
      this.logger.warn(`Failed to invalidate reels feed cache: ${String(e)}`);
    }
  }

  async getFeed(
    limit = 10,
    after?: string,
    viewerId?: string,
  ): Promise<Paginated<ReelResponseDto>> {
    let exclusions: ReelsFeedExclusions | undefined;
    if (viewerId) {
      try {
        const client = this.redis.getClient();
        const [reelIds, authorIds] = await Promise.all([
          client.smembers(`reels:not_interested:${viewerId}:reels`),
          client.smembers(`reels:not_interested:${viewerId}:authors`),
        ]);
        exclusions = { reelIds, authorIds };
      } catch {
        // Preference filtering degrades on Redis failure; authorization never does.
      }
    }
    const rows = await this.reelsRepository.findAllPaginated(
      limit + 1,
      after,
      viewerId,
      exclusions,
    );
    return paginate(rows, limit, (item) => this.mapToDto(item, viewerId));
  }

  async getUserReels(
    userId: string,
    limit = 12,
    after?: string,
    viewerId?: string,
  ): Promise<Paginated<ReelResponseDto>> {
    const rows = await this.reelsRepository.findByUserId(userId, limit + 1, after, viewerId);
    return paginate(rows, limit, (item) => this.mapToDto(item, viewerId));
  }

  async getReelById(id: string, viewerId?: string): Promise<ReelResponseDto> {
    const reel = await this.reelsRepository.findById(id, viewerId);
    if (!reel) throw new NotFoundException('Reel not found');
    return this.mapToDto(reel, viewerId);
  }

  async getSavedReels(
    userId: string,
    limit = 12,
    after?: string,
  ): Promise<Paginated<ReelResponseDto>> {
    const rows = await this.reelsRepository.findSaved(userId, limit + 1, after);
    return paginate(rows, limit, (item) => this.mapToDto(item.reel, userId));
  }

  async setSaved(reelId: string, userId: string, saved: boolean) {
    return this.reelsRepository.setSaved(reelId, userId, saved);
  }

  async createReel(
    authorId: string,
    dto: CreateReelDto,
    file?: Express.Multer.File,
    thumbnailFile?: Express.Multer.File,
  ): Promise<ReelResponseDto> {
    const direct = dto.uploadId
      ? await this.directUploads.resolve(authorId, dto.uploadId, 'reel')
      : undefined;
    let videoUrl = direct?.url;
    if (file) this.directUploads.assertLegacyAllowed();
    let sourceStorageKey: string | undefined;
    let thumbnailUrl: string | null = null;
    let blurhash: string | null = null;

    if (file) {
      if (!file.mimetype.startsWith('video/')) {
        throw new BadRequestException('Uploaded file must be a video');
      }
      const maxVideoSize = 20 * 1024 * 1024;
      if (file.buffer.length > maxVideoSize) {
        throw new BadRequestException('Video size exceeds 20 MiB limit');
      }

      const fileId = uid(16);
      const originalExt = file.originalname.split('.').pop() || 'mp4';
      const ext = /^[a-z0-9]{1,16}$/i.test(originalExt) ? originalExt : 'mp4';
      const key = `reels/${fileId}.${ext}`;

      // Enterprise FastStart Optimization: Move moov atom before mdat for instant progressive streaming
      const optimizedBuffer = optimizeMp4FastStart(file.buffer);

      videoUrl = await uploadToStorageWithFallback(this.s3, {
        bucket: this.bucket,
        key,
        buffer: optimizedBuffer,
        contentType: file.mimetype,
        publicUrl: this.publicUrl,
        cacheControl: 'public, max-age=31536000, immutable',
      });
      if (!videoUrl.startsWith('data:')) sourceStorageKey = key;

      // If client provided a generated thumbnail frame, process and upload to Cloudflare R2 / S3
      if (thumbnailFile && thumbnailFile.buffer) {
        try {
          const processedThumb = await optimizeVideoThumbnail(thumbnailFile.buffer);
          const thumbKey = `reels/${fileId}-thumb.webp`;
          thumbnailUrl = await uploadToStorageWithFallback(this.s3, {
            bucket: this.bucket,
            key: thumbKey,
            buffer: processedThumb.buffer,
            contentType: processedThumb.contentType,
            publicUrl: this.publicUrl,
            cacheControl: 'public, max-age=31536000, immutable',
          });
          blurhash = processedThumb.blurhash;
        } catch (thumbErr) {
          this.logger.warn(`Thumbnail optimization failed: ${String(thumbErr)}`);
        }
      }
    }

    if (!videoUrl) {
      throw new BadRequestException('A video file or valid video URL is required');
    }

    const reel = await this.reelsRepository.create({
      author: { connect: { id: authorId } },
      caption: dto.caption ?? '',
      videoUrl,
      thumbnailUrl,
      blurhash,
      audioTitle: dto.audioTitle ?? null,
      audioArtist: dto.audioArtist ?? null,
      audioUrl: dto.audioUrl ?? null,
      duration: direct?.duration ?? dto.duration ?? null,
      width: direct?.width ?? dto.width ?? null,
      height: direct?.height ?? dto.height ?? null,
    });

    await this.invalidateFeedCache();

    // Trigger BullMQ adaptive HLS transcode worker in background
    if (
      this.configService.get<string>('VIDEO_TRANSCODE_ENABLED') === 'true' &&
      this.queueService &&
      !reel.videoUrl.startsWith('data:')
    ) {
      await this.queueService.addVideoTranscodeJob(
        {
          reelId: reel.id,
          videoUrl: reel.videoUrl,
          ...(sourceStorageKey ? { sourceStorageKey } : {}),
        },
        { jobId: `reel-${reel.id}` },
      );
    }

    return this.mapToDto(reel, authorId);
  }

  async toggleLike(
    reelId: string,
    userId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const reel = await this.reelsRepository.findById(reelId, userId);
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }
    return this.reelsRepository.toggleLike(reelId, userId);
  }

  async recordView(
    reelId: string,
    viewerIdentifier: string,
    viewerId?: string,
  ): Promise<{ success: boolean; counted: boolean }> {
    await this.getReelById(reelId, viewerId);
    const key = `reels:view:${reelId}:${viewerIdentifier}`;
    let counted = true;
    let reserved = false;
    try {
      const res = await this.redis.getClient().set(key, '1', 'EX', 300, 'NX');
      counted = res === 'OK';
      reserved = counted;
    } catch {
      // Redis failure only degrades view deduplication, never persistence errors.
    }
    if (counted) {
      try {
        await this.reelsRepository.incrementViews(reelId);
      } catch (error) {
        if (reserved) {
          try {
            await this.redis.getClient().del(key);
          } catch {
            // Preserve the original persistence error even if Redis is unavailable.
          }
        }
        throw error;
      }
    }
    return { success: true, counted };
  }

  async recordShare(reelId: string, viewerId?: string): Promise<{ success: boolean }> {
    await this.getReelById(reelId, viewerId);
    await this.reelsRepository.incrementShares(reelId);
    return { success: true };
  }

  async addComment(
    reelId: string,
    userId: string,
    content: string,
  ): Promise<ReelCommentResponseDto> {
    const reel = await this.reelsRepository.findById(reelId, userId);
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }
    const comment = await this.reelsRepository.addComment(reelId, userId, content);
    return this.mapCommentToDto(comment);
  }

  async getComments(
    reelId: string,
    limit = 20,
    after?: string,
    viewerId?: string,
  ): Promise<ReelCommentResponseDto[]> {
    await this.getReelById(reelId, viewerId);
    const comments = await this.reelsRepository.findComments(reelId, limit, after);
    return comments.map((c) => this.mapCommentToDto(c));
  }

  async deleteReel(id: string, userId: string): Promise<void> {
    const reel = await this.reelsRepository.findById(id, userId);
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }
    if (reel.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own reels');
    }
    await this.reelsRepository.delete(id);
    await this.invalidateFeedCache();
  }

  async markNotInterested(reelId: string, userId: string): Promise<{ success: boolean }> {
    const reel = await this.reelsRepository.findById(reelId, userId);
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }
    try {
      const redisClient = this.redis.getClient();
      const pipeline = redisClient.pipeline();
      pipeline.sadd(`reels:not_interested:${userId}:reels`, reelId);
      pipeline.expire(`reels:not_interested:${userId}:reels`, 60 * 60 * 24 * 30);
      pipeline.sadd(`reels:not_interested:${userId}:authors`, reel.authorId);
      pipeline.expire(`reels:not_interested:${userId}:authors`, 60 * 60 * 24 * 30);

      // Extract hashtags
      const hashtags = (reel.caption.match(/#[a-zA-Z0-9_\u0400-\u04FF]+/g) || []).map((t) =>
        t.toLowerCase(),
      );
      if (hashtags.length > 0) {
        pipeline.sadd(`reels:not_interested:${userId}:tags`, ...hashtags);
        pipeline.expire(`reels:not_interested:${userId}:tags`, 60 * 60 * 24 * 30);
      }
      const results = await pipeline.exec();
      if (!results || results.some(([error]) => error)) {
        throw new Error('Could not save your reel preference');
      }
    } catch (e) {
      this.logger.warn(`Failed to save not_interested in redis: ${String(e)}`);
      throw e;
    }
    return { success: true };
  }

  async reportReel(
    reelId: string,
    userId: string,
    category: string,
    details?: string,
  ): Promise<{ success: boolean; message: string }> {
    const reel = await this.reelsRepository.findById(reelId, userId);
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }
    await this.reelsRepository.reportReel(reelId, userId, category, details);
    return { success: true, message: 'Report submitted successfully' };
  }
}
