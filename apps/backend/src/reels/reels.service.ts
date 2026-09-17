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
      createdAt: reel.createdAt.toISOString(),
      author: {
        id: reel.author.id,
        username: reel.author.username,
        displayName: reel.author.displayName,
        avatar: reel.author.avatar,
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

  private getSeedFeed(): Paginated<ReelResponseDto> {
    const seed: ReelResponseDto[] = [
      {
        id: 'reel-profkino-1',
        authorId: 'user-profkino',
        caption: 'Сосед-авторитет врубил шумит ночью, но за бессонную ночь дочери',
        videoUrl: '/videos/sample-reel.mp4',
        hlsUrl: null,
        thumbnailUrl: null,
        blurhash: 'U35;y-of00ay_3j[00ay00fQ~qj[00j[00ay',
        thumbhash: null,
        duration: 15,
        width: 720,
        height: 1280,
        audioTitle: 'Монтувати тепер легко · CapCut Sound',
        audioArtist: 'CapCut',
        audioUrl: null,
        viewsCount: 1250000,
        likesCount: 442100,
        commentsCount: 5,
        sharesCount: 19900,
        isLiked: false,
        createdAt: new Date().toISOString(),
        author: {
          id: 'user-profkino',
          username: 'PROFKINO',
          displayName: 'PROFKINO',
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          isFollowing: false,
        },
      },
      {
        id: 'reel-city-2',
        authorId: 'user-anna',
        caption: 'Нічні вогні великого міста 🌃 Атмосферна прогулянка та кінематографічна естетика',
        videoUrl: '/videos/sample-reel-2.mp4',
        hlsUrl: null,
        thumbnailUrl: null,
        blurhash: 'U66t$0of00ay~qj[00ay00fQ~qj[00j[00ay',
        thumbhash: null,
        duration: 10,
        width: 720,
        height: 1280,
        audioTitle: 'Night Mood (Lofi Chill)',
        audioArtist: 'ChillCity Beats',
        audioUrl: null,
        viewsCount: 890000,
        likesCount: 156300,
        commentsCount: 34,
        sharesCount: 8200,
        isLiked: true,
        createdAt: new Date().toISOString(),
        author: {
          id: 'user-anna',
          username: 'anna_cinema',
          displayName: 'Anna Cinema',
          avatar:
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          isVerified: true,
          isFollowing: true,
        },
      },
    ];
    return {
      data: seed,
      meta: {
        hasNextPage: false,
        nextCursor: null,
      },
    };
  }

  async getFeed(
    limit = 10,
    after?: string,
    viewerId?: string,
  ): Promise<Paginated<ReelResponseDto>> {
    try {
      // Fetch limit + 5 to determine hasNextPage and allow for not_interested filtering
      let rows = await this.reelsRepository.findAllPaginated(limit + 5, after, viewerId);

      if (rows.length === 0 && !after) {
        return this.getSeedFeed();
      }

      if (viewerId) {
        try {
          const redisClient = this.redis.getClient();
          const [hiddenReels, hiddenAuthors] = await Promise.all([
            redisClient.smembers(`reels:not_interested:${viewerId}:reels`),
            redisClient.smembers(`reels:not_interested:${viewerId}:authors`),
          ]);
          const hiddenReelsSet = new Set(hiddenReels || []);
          const hiddenAuthorsSet = new Set(hiddenAuthors || []);
          rows = rows.filter((r) => !hiddenReelsSet.has(r.id) && !hiddenAuthorsSet.has(r.authorId));
        } catch {
          // Fallback gracefully if Redis is unavailable
        }
      }

      return paginate(rows, limit, (item) => this.mapToDto(item, viewerId));
    } catch (err) {
      this.logger.warn(
        `Could not load reels from repository: ${String(err)}. Returning seed feed.`,
      );
      return this.getSeedFeed();
    }
  }

  async getUserReels(
    userId: string,
    limit = 12,
    after?: string,
    viewerId?: string,
  ): Promise<Paginated<ReelResponseDto>> {
    try {
      const rows = await this.reelsRepository.findByUserId(userId, limit + 1, after, viewerId);
      return paginate(rows, limit, (item) => this.mapToDto(item, viewerId));
    } catch {
      return {
        data: [],
        meta: { hasNextPage: false, nextCursor: null },
      };
    }
  }

  async getReelById(id: string, viewerId?: string): Promise<ReelResponseDto> {
    try {
      const reel = await this.reelsRepository.findById(id, viewerId);
      if (!reel) {
        const seedItem = this.getSeedFeed().data.find((r) => r.id === id);
        if (seedItem) return seedItem;
        throw new NotFoundException('Reel not found');
      }
      return this.mapToDto(reel, viewerId);
    } catch (err) {
      const seedItem = this.getSeedFeed().data.find((r) => r.id === id);
      if (seedItem) return seedItem;
      throw err;
    }
  }

  async createReel(
    authorId: string,
    dto: CreateReelDto,
    file?: Express.Multer.File,
    thumbnailFile?: Express.Multer.File,
  ): Promise<ReelResponseDto> {
    let videoUrl = dto.audioUrl; // fallback if needed
    let thumbnailUrl: string | null = null;
    let blurhash: string | null = null;

    if (file) {
      if (!file.mimetype.startsWith('video/')) {
        throw new BadRequestException('Uploaded file must be a video');
      }
      const maxVideoSize = 150 * 1024 * 1024; // 150MB for short reels
      if (file.buffer.length > maxVideoSize) {
        throw new BadRequestException('Video size exceeds 150MB limit');
      }

      const fileId = uid(16);
      const ext = file.originalname.split('.').pop() || 'mp4';
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
      duration: dto.duration ?? null,
      width: dto.width ?? null,
      height: dto.height ?? null,
    });

    await this.invalidateFeedCache();

    // Trigger BullMQ adaptive HLS transcode worker in background
    if (this.queueService) {
      await this.queueService.addVideoTranscodeJob({
        reelId: reel.id,
        videoUrl: reel.videoUrl,
        sourceBufferBase64: file ? file.buffer.toString('base64') : undefined,
      });
    }

    return this.mapToDto(reel, authorId);
  }

  async toggleLike(
    reelId: string,
    userId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const reel = await this.reelsRepository.findById(reelId);
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }
    return this.reelsRepository.toggleLike(reelId, userId);
  }

  async recordView(
    reelId: string,
    viewerIdentifier: string,
  ): Promise<{ success: boolean; counted: boolean }> {
    const key = `reels:view:${reelId}:${viewerIdentifier}`;
    try {
      const redisClient = this.redis.getClient();
      // Set key with 300s TTL only if not exists (debounced view)
      const res = await redisClient.set(key, '1', 'EX', 300, 'NX');
      if (res === 'OK') {
        await this.reelsRepository.incrementViews(reelId);
        return { success: true, counted: true };
      }
      return { success: true, counted: false };
    } catch {
      // Degraded / passive mode: increment directly
      await this.reelsRepository.incrementViews(reelId);
      return { success: true, counted: true };
    }
  }

  async recordShare(reelId: string): Promise<{ success: boolean }> {
    await this.reelsRepository.incrementShares(reelId);
    return { success: true };
  }

  async addComment(
    reelId: string,
    userId: string,
    content: string,
  ): Promise<ReelCommentResponseDto> {
    const reel = await this.reelsRepository.findById(reelId);
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }
    const comment = await this.reelsRepository.addComment(reelId, userId, content);
    return this.mapCommentToDto(comment);
  }

  async getComments(reelId: string, limit = 20, after?: string): Promise<ReelCommentResponseDto[]> {
    const comments = await this.reelsRepository.findComments(reelId, limit, after);
    return comments.map((c) => this.mapCommentToDto(c));
  }

  async deleteReel(id: string, userId: string): Promise<void> {
    const reel = await this.reelsRepository.findById(id);
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
    const reel = await this.reelsRepository.findById(reelId);
    if (!reel) {
      return { success: true };
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
      await pipeline.exec();
    } catch (e) {
      this.logger.warn(`Failed to save not_interested in redis: ${String(e)}`);
    }
    return { success: true };
  }

  async reportReel(
    reelId: string,
    userId: string,
    category: string,
    details?: string,
  ): Promise<{ success: boolean; message: string }> {
    const reel = await this.reelsRepository.findById(reelId);
    if (!reel) {
      return { success: true, message: 'Report submitted successfully' };
    }
    if (this.reelsRepository.reportReel) {
      await this.reelsRepository.reportReel(reelId, userId, category, details);
    }
    return { success: true, message: 'Report submitted successfully' };
  }
}
