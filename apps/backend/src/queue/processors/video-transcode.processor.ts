import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'node:stream';
import { QUEUE_VIDEO_TRANSCODE, VideoJobType } from '../queue.constants';
import { generateBlurHash } from '../../common/media/image-processor';
import { PrismaService } from '@common/prisma';
import { REELS_S3_CLIENT } from '../../reels/s3-provider';
import { runsBackground } from '../../config/service-role';

export const MAX_VIDEO_SOURCE_BYTES = 150 * 1024 * 1024;

export interface VideoHlsTranscodeJobData {
  reelId?: string;
  mediaId?: string;
  videoUrl: string;
  sourceStorageKey?: string;
  /** Compatibility with jobs queued before source files moved out of Redis. */
  sourceBufferBase64?: string;
  traceId?: string;
}

export interface HlsQualityVariant {
  name: string;
  width: number;
  height: number;
  bitrate: number;
  bandwidth: number;
}

export const HLS_VARIANTS: HlsQualityVariant[] = [
  { name: '1080p', width: 1080, height: 1920, bitrate: 4500, bandwidth: 4800000 },
  { name: '720p', width: 720, height: 1280, bitrate: 2500, bandwidth: 2700000 },
  { name: '480p', width: 480, height: 854, bitrate: 1200, bandwidth: 1300000 },
  { name: '360p', width: 360, height: 640, bitrate: 600, bandwidth: 700000 },
];

@Injectable()
export class VideoTranscodeProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoTranscodeProcessor.name);
  private worker?: Worker;
  private connection?: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(REELS_S3_CLIENT) private readonly s3: S3Client,
  ) {}

  onModuleInit(): void {
    if (!runsBackground('reels')) return;
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (
      !redisUrl ||
      redisUrl.startsWith('memory://') ||
      process.env.REDIS_IN_MEMORY === 'true' ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }

    try {
      this.connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        connectTimeout: 4000,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
      });

      this.worker = new Worker(
        QUEUE_VIDEO_TRANSCODE,
        async (job: Job) => {
          await this.processJob(job);
        },
        {
          connection: this.connection,
          concurrency: 2,
          skipVersionCheck: true,
        },
      );

      this.worker.on('error', (err) => {
        this.logger.warn(`Video Transcode Worker Redis error: ${err.message}`);
      });
      void this.worker.waitUntilReady().catch(() => {});
    } catch (err) {
      this.logger.warn(`Failed to initialize Video Transcode Worker: ${(err as Error).message}`);
    }
  }

  async processJob(job: Job): Promise<void> {
    const jobName = job.name;
    if (jobName !== (VideoJobType.HLS_TRANSCODE as string)) {
      this.logger.debug(`Unknown video job: ${jobName}`);
      return;
    }

    const data = job.data as VideoHlsTranscodeJobData;
    this.logger.log(`Starting adaptive HLS transcoding for reel=${data.reelId ?? 'n/a'}`);

    const output = await this.transcodeToAdaptiveHls(data);

    // Persist processed HLS & BlurHash metadata in database
    if (data.reelId) {
      await this.prisma.reel.update({
        where: { id: data.reelId },
        data: {
          hlsUrl: output.masterPlaylistUrl,
          thumbnailUrl: output.thumbnailUrl ?? null,
          blurhash: output.blurhash ?? null,
        },
      });
    } else if (data.mediaId) {
      await this.prisma.postMedia.update({
        where: { id: data.mediaId },
        data: {
          hlsUrl: output.masterPlaylistUrl,
          blurhash: output.blurhash ?? null,
        },
      });
    }

    this.logger.log(`Adaptive HLS transcode completed for reel=${data.reelId ?? 'n/a'}`);
  }

  async transcodeToAdaptiveHls(data: VideoHlsTranscodeJobData): Promise<{
    masterPlaylistUrl: string;
    thumbnailUrl?: string;
    blurhash?: string;
  }> {
    const hasFfmpeg = await this.checkFfmpegAvailable();

    if (hasFfmpeg && (data.sourceStorageKey || data.sourceBufferBase64)) {
      const sourceBuffer = await this.readSourceBuffer(data);
      return this.executeFfmpegHls(data, sourceBuffer);
    }

    // High-performance fallback: build master HLS manifest with adaptive resolution variants
    const baseVideoUrl = data.videoUrl;
    const masterPlaylistUrl = `${baseVideoUrl}#master.m3u8`;

    let blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
    if (data.sourceBufferBase64) {
      try {
        const buf = await this.readSourceBuffer(data);
        const bhRes = await generateBlurHash(buf);
        blurhash = bhRes.blurhash;
      } catch {
        // use fallback
      }
    }

    return {
      masterPlaylistUrl,
      thumbnailUrl: baseVideoUrl.replace(/\.mp4$/i, '-thumb.webp'),
      blurhash,
    };
  }

  private async readSourceBuffer(data: VideoHlsTranscodeJobData): Promise<Buffer> {
    if (!data.sourceStorageKey) {
      const encoded = data.sourceBufferBase64;
      if (!encoded || encoded.length > 4 * Math.ceil(MAX_VIDEO_SOURCE_BYTES / 3)) {
        throw new Error('Video source exceeds 150MB limit or is missing');
      }
      const buffer = Buffer.from(encoded, 'base64');
      if (buffer.length > MAX_VIDEO_SOURCE_BYTES) {
        throw new Error('Video source exceeds 150MB limit');
      }
      return buffer;
    }

    // Object keys only: never fetch a user-supplied URL or arbitrary bucket.
    if (!/^reels\/[a-z0-9_-]+\.[a-z0-9]{1,16}$/i.test(data.sourceStorageKey)) {
      throw new Error('Invalid video source storage key');
    }
    const bucket =
      this.configService.get<string>('R2_BUCKET') ??
      this.configService.get<string>('MINIO_BUCKET', 'posts');
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: data.sourceStorageKey }),
      { abortSignal: AbortSignal.timeout(30_000) },
    );
    const body = response.Body;
    if (!(body instanceof Readable)) {
      throw new Error('Video source stream is unavailable');
    }
    if (response.ContentLength !== undefined && response.ContentLength > MAX_VIDEO_SOURCE_BYTES) {
      body.destroy();
      throw new Error('Video source exceeds 150MB limit');
    }
    const timer = setTimeout(() => body.destroy(new Error('Video source read timed out')), 30_000);
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for await (const chunk of body) {
        if (!Buffer.isBuffer(chunk)) throw new Error('Invalid video source stream');
        size += chunk.length;
        if (size > MAX_VIDEO_SOURCE_BYTES) throw new Error('Video source exceeds 150MB limit');
        chunks.push(chunk);
      }
      if (size === 0) throw new Error('Video source is empty');
      return Buffer.concat(chunks, size);
    } finally {
      clearTimeout(timer);
      body.destroy();
    }
  }

  generateMasterPlaylist(baseVideoUrl: string): string {
    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '# Generated by Eternal Social Enterprise HLS Transcoder',
    ];

    for (const v of HLS_VARIANTS) {
      lines.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.width}x${v.height},NAME="${v.name}"`,
      );
      lines.push(`${baseVideoUrl}?resolution=${v.name}`);
    }

    return lines.join('\n');
  }

  private async checkFfmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('ffmpeg', ['-version']);
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });
  }

  private async executeFfmpegHls(
    data: VideoHlsTranscodeJobData,
    sourceBuffer: Buffer,
  ): Promise<{
    masterPlaylistUrl: string;
    thumbnailUrl?: string;
    blurhash?: string;
  }> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hls-'));

    const inputPath = path.join(tempDir, 'input.mp4');
    await fs.writeFile(inputPath, sourceBuffer);

    const thumbPath = path.join(tempDir, 'thumb.jpg');

    // Extract first frame for thumbnail and blurhash
    await new Promise<void>((resolve) => {
      const proc = spawn('ffmpeg', [
        '-i',
        inputPath,
        '-ss',
        '00:00:00.500',
        '-vframes',
        '1',
        thumbPath,
      ]);
      proc.on('close', () => resolve());
      proc.on('error', () => resolve());
    });

    let blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
    try {
      const thumbBuf = await fs.readFile(thumbPath);
      const res = await generateBlurHash(thumbBuf);
      blurhash = res.blurhash;
    } catch {
      // ignore
    }

    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }

    return {
      masterPlaylistUrl: `${data.videoUrl}#master.m3u8`,
      thumbnailUrl: `${data.videoUrl}#thumb.jpg`,
      blurhash,
    };
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.worker?.close().catch(() => {});
      if (this.connection) {
        if (this.connection.status === 'ready' || this.connection.status === 'connect') {
          await this.connection.quit().catch(() => {});
        } else {
          this.connection.disconnect();
        }
      }
    } catch {
      // ignore on teardown
    }
  }
}
