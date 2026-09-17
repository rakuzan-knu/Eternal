import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { QUEUE_SEARCH_INDEXING, SearchJobType } from '../queue.constants';
import { QueueService } from '../queue.service';
import { RedisService } from '../../redis/redis.service';
import { TraceContext } from '../../common/tracing/trace-context';

export interface SearchIndexJobData {
  id: string;
  type: 'user' | 'hashtag' | 'post';
  tags?: string[];
  content?: string;
}

@Injectable()
export class SearchIndexingProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchIndexingProcessor.name);
  private worker?: Worker;
  private connection?: Redis;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly redis?: RedisService,
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
        QUEUE_SEARCH_INDEXING,
        async (job: Job) => {
          const traceId =
            (job.data as { traceId?: string } | undefined)?.traceId ||
            `job-search-${job.name}-${job.id ?? 'unknown'}`;
          await TraceContext.runIsolated(
            {
              traceId,
              correlationId: traceId,
              reqMethod: 'BULLMQ_JOB',
              reqUrl: `queue:${QUEUE_SEARCH_INDEXING}:${job.name}`,
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
        this.logger.warn(`Search indexing Worker Redis error: ${err.message}`);
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
      this.logger.warn(`Failed to initialize Search Indexing Worker: ${(err as Error).message}`);
    }
  }

  private async handleJobFailed(job: Job | undefined, err: Error): Promise<void> {
    this.logger.warn(
      `Search index job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts ?? 3}): ${err.message}`,
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
    const indexData = job.data as SearchIndexJobData;

    if (jobName === (SearchJobType.INDEX_HASHTAG as string)) {
      if (indexData?.tags && Array.isArray(indexData.tags) && this.redis) {
        for (const tag of indexData.tags) {
          const cleanTag = tag.replace(/^#/, '').toLowerCase();
          if (cleanTag) {
            await this.redis.incr(`hashtag:count:${cleanTag}`).catch(() => {});
          }
        }
      }
    } else if (
      jobName === (SearchJobType.INDEX_USER as string) ||
      jobName === (SearchJobType.INDEX_POST as string)
    ) {
      this.logger.debug(`Processed search indexing for ${indexData.type} ${indexData.id}`);
    } else {
      this.logger.debug(`Unknown search indexing job type: ${jobName}`);
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
