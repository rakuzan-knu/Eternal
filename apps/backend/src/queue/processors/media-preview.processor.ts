import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { QUEUE_MEDIA_PREVIEWS, MediaJobType } from '../queue.constants';
import { QueueService } from '../queue.service';
import sharp from 'sharp';
import { TraceContext } from '../../common/tracing/trace-context';

export interface ImageOptimizeJobData {
  bufferBase64: string;
  width?: number;
  height?: number;
  quality?: number;
}

export interface LinkPreviewJobData {
  url: string;
  conversationId?: string;
  messageId?: string;
}

@Injectable()
export class MediaPreviewProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaPreviewProcessor.name);
  private worker?: Worker;
  private connection?: Redis;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly queueService?: QueueService,
  ) {}

  onModuleInit(): void {
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
        QUEUE_MEDIA_PREVIEWS,
        async (job: Job) => {
          const traceId =
            (job.data as { traceId?: string } | undefined)?.traceId ||
            `job-media-${job.name}-${job.id ?? 'unknown'}`;
          await TraceContext.runIsolated(
            {
              traceId,
              correlationId: traceId,
              reqMethod: 'BULLMQ_JOB',
              reqUrl: `queue:${QUEUE_MEDIA_PREVIEWS}:${job.name}`,
              startTime: Date.now(),
              startHrTime: process.hrtime.bigint(),
            },
            async () => {
              await this.processJob(job);
            },
          );
        },
        {
          connection: this.connection,
          concurrency: 5,
          skipVersionCheck: true,
        },
      );

      this.worker.on('error', (err) => {
        this.logger.warn(`Media preview Worker Redis error: ${err.message}`);
      });
      void this.worker.client
        ?.then((client) => {
          client?.on?.('error', () => {});
        })
        .catch(() => {});
      void this.worker.waitUntilReady().catch(() => {});

      this.worker.on('failed', (job, err) => {
        void this.handleJobFailed(job, err);
      });
    } catch (err) {
      this.logger.warn(`Failed to initialize Media Preview Worker: ${(err as Error).message}`);
    }
  }

  private async handleJobFailed(job: Job | undefined, err: Error): Promise<void> {
    this.logger.warn(
      `Media preview job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts ?? 3}): ${err.message}`,
    );
    if (
      job &&
      (job.attemptsMade >= (job.opts?.attempts ?? 3) ||
        Boolean((err as unknown as { isPoisonPill?: boolean }).isPoisonPill))
    ) {
      await this.queueService?.moveToDeadLetterQueue(
        job,
        err,
        Boolean((err as unknown as { isPoisonPill?: boolean }).isPoisonPill),
      );
    }
  }

  async processJob(job: Job): Promise<void> {
    const jobName = job.name;

    if (jobName === (MediaJobType.IMAGE_OPTIMIZE as string)) {
      const imgData = job.data as ImageOptimizeJobData;
      if (!imgData?.bufferBase64) return;
      const inputBuffer = Buffer.from(imgData.bufferBase64, 'base64');
      await sharp(inputBuffer)
        .resize({
          width: imgData.width ?? 800,
          height: imgData.height,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: imgData.quality ?? 80 })
        .toBuffer();
    } else if (jobName === (MediaJobType.LINK_PREVIEW as string)) {
      const linkData = job.data as LinkPreviewJobData;
      if (!linkData?.url) return;
      this.logger.debug(`Background processing OpenGraph preview for URL: ${linkData.url}`);
    } else {
      this.logger.debug(`Unknown media job type: ${jobName}`);
    }
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
