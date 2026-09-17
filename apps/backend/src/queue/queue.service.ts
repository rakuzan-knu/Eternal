import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, type Job, type JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import {
  QUEUE_MESSAGES,
  QUEUE_MEDIA_PREVIEWS,
  QUEUE_NOTIFICATIONS,
  QUEUE_SEARCH_INDEXING,
  QUEUE_DEAD_LETTER,
  QUEUE_VIDEO_TRANSCODE,
  NotificationJobType,
  MediaJobType,
  SearchJobType,
  MessageJobType,
  VideoJobType,
  type DeadLetterJobData,
} from './queue.constants';
import { AlertingService } from '../common/resilience/alerting.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  private connection?: Redis;
  private notificationsQueue?: Queue;
  private mediaPreviewsQueue?: Queue;
  private searchIndexingQueue?: Queue;
  private messagesQueue?: Queue;
  private deadLetterQueue?: Queue;
  private videoTranscodeQueue?: Queue;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly alertingService?: AlertingService,
    @Inject(forwardRef(() => MetricsService))
    @Optional()
    private readonly metricsService?: MetricsService,
  ) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (
      !redisUrl ||
      redisUrl.startsWith('memory://') ||
      process.env.REDIS_IN_MEMORY === 'true' ||
      (process.env.NODE_ENV === 'test' && process.env.TEST_BULLMQ !== 'true')
    ) {
      this.logger.log('BullMQ Queues running in passive in-memory test fallback mode.');
      return;
    }

    try {
      this.connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        connectTimeout: 4000,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
      });

      let hasLoggedError = false;
      this.connection.on('error', (err: Error) => {
        if (!hasLoggedError) {
          this.logger.warn(`BullMQ Redis connection error: ${err.message || 'ECONNREFUSED'}`);
          hasLoggedError = true;
        }
      });
      this.connection.on('ready', () => {
        hasLoggedError = false;
        this.logger.log('BullMQ Redis connection established.');
      });

      const defaultJobOptions: JobsOptions = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      };

      const setupQueue = (name: string, opts = defaultJobOptions): Queue => {
        const q = new Queue(name, {
          connection: this.connection!,
          defaultJobOptions: opts,
          skipVersionCheck: true,
        });
        q.on('error', (err) => {
          this.logger.debug(`Queue ${name} Redis error: ${err.message}`);
        });
        void q.client
          ?.then((client) => {
            client?.on?.('error', () => {});
          })
          .catch(() => {});
        void q.waitUntilReady().catch(() => {});
        return q;
      };

      this.notificationsQueue = setupQueue(QUEUE_NOTIFICATIONS);
      this.mediaPreviewsQueue = setupQueue(QUEUE_MEDIA_PREVIEWS);
      this.searchIndexingQueue = setupQueue(QUEUE_SEARCH_INDEXING);
      this.messagesQueue = setupQueue(QUEUE_MESSAGES);
      this.videoTranscodeQueue = setupQueue(QUEUE_VIDEO_TRANSCODE);
      this.deadLetterQueue = setupQueue(QUEUE_DEAD_LETTER, {
        removeOnComplete: 1000,
        removeOnFail: 1000,
      });
    } catch (err) {
      this.logger.warn(`Failed to initialize BullMQ Queues: ${(err as Error).message}`);
    }
  }

  async addNotificationJob(
    jobType: NotificationJobType | string,
    data: unknown,
    opts?: JobsOptions,
  ): Promise<void> {
    try {
      if (this.notificationsQueue) {
        await this.notificationsQueue.add(jobType, data, opts);
      }
    } catch (err) {
      this.logger.warn(`Failed to add job to notifications queue: ${(err as Error).message}`);
    }
  }

  async addMediaPreviewJob(
    jobType: MediaJobType | string,
    data: unknown,
    opts?: JobsOptions,
  ): Promise<void> {
    try {
      if (this.mediaPreviewsQueue) {
        await this.mediaPreviewsQueue.add(jobType, data, opts);
      }
    } catch (err) {
      this.logger.warn(`Failed to add job to media previews queue: ${(err as Error).message}`);
    }
  }

  async addSearchIndexingJob(
    jobType: SearchJobType | string,
    data: unknown,
    opts?: JobsOptions,
  ): Promise<void> {
    try {
      if (this.searchIndexingQueue) {
        await this.searchIndexingQueue.add(jobType, data, opts);
      }
    } catch (err) {
      this.logger.warn(`Failed to add job to search indexing queue: ${(err as Error).message}`);
    }
  }

  async addMessageJob(
    jobType: MessageJobType | string,
    data: unknown,
    opts?: JobsOptions,
  ): Promise<void> {
    try {
      if (this.messagesQueue) {
        await this.messagesQueue.add(jobType, data, opts);
      }
    } catch (err) {
      this.logger.warn(`Failed to add job to messages queue: ${(err as Error).message}`);
    }
  }

  async addVideoTranscodeJob(data: unknown, opts?: JobsOptions): Promise<void> {
    try {
      if (this.videoTranscodeQueue) {
        await this.videoTranscodeQueue.add(VideoJobType.HLS_TRANSCODE, data, opts);
      }
    } catch (err) {
      this.logger.warn(`Failed to add job to video transcode queue: ${(err as Error).message}`);
    }
  }

  async addGlobalEntityFanoutJob(
    conversationId: string,
    event: string,
    payload: unknown,
    excludedUserId?: string,
    opts?: JobsOptions,
  ): Promise<void> {
    await this.addMessageJob(
      MessageJobType.GLOBAL_ENTITY_FANOUT,
      {
        conversationId,
        event,
        payload,
        excludedUserId,
      },
      opts,
    );
  }

  /**
   * Routes a fatally failed job or poison pill to the Dead Letter Queue (DLQ)
   * and fires alerts to Slack/Alertmanager without blocking the queue.
   */
  async moveToDeadLetterQueue(job: Job, error: Error, isPoisonPill = false): Promise<void> {
    const traceId =
      (job.data as { traceId?: string } | undefined)?.traceId ||
      `dlq-${job.queueName || 'unknown'}-${job.name}-${job.id ?? 'unknown'}`;

    const dlqData: DeadLetterJobData = {
      originalQueue: job.queueName || 'unknown',
      jobId: String(job.id ?? 'unknown'),
      jobName: job.name,
      data: job.data,
      failedReason: error.message || String(error),
      stackTrace: error.stack,
      attemptsMade: job.attemptsMade || 1,
      failedAt: new Date().toISOString(),
      traceId,
      isPoisonPill:
        isPoisonPill || Boolean((error as unknown as { isPoisonPill?: boolean }).isPoisonPill),
    };

    try {
      if (this.deadLetterQueue && this.connection?.status === 'ready') {
        await this.deadLetterQueue
          .add('dead_letter_entry', dlqData, {
            removeOnComplete: false,
            removeOnFail: false,
          })
          .catch((err) => {
            this.logger.warn(`Could not add to Redis DLQ queue: ${(err as Error).message}`);
          });
      }

      this.logger.error(
        `[DLQ] Moved job ${dlqData.jobId} from ${dlqData.originalQueue} to DLQ. Reason: ${dlqData.failedReason}`,
      );

      // Trigger Alerting Service
      if (this.alertingService) {
        await this.alertingService.sendDlqAlert(dlqData);
      }

      // Record Prometheus DLQ Metric
      if (this.metricsService?.recordDlqJob) {
        this.metricsService.recordDlqJob(
          dlqData.originalQueue,
          dlqData.jobName,
          dlqData.isPoisonPill || false,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed in Dead Letter Queue handler: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Fetches entries from the Dead Letter Queue
   */
  async getDeadLetterJobs(start = 0, end = 50): Promise<DeadLetterJobData[]> {
    if (!this.deadLetterQueue) return [];
    try {
      const jobs = await this.deadLetterQueue.getJobs(
        ['waiting', 'active', 'completed', 'failed'],
        start,
        end,
      );
      return jobs.map((j) => j.data as DeadLetterJobData);
    } catch (err) {
      this.logger.warn(`Failed to fetch DLQ jobs: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Retries a dead-letter job by re-queueing it into its original queue
   */
  async retryDeadLetterJob(dlqJobId: string): Promise<boolean> {
    if (!this.deadLetterQueue) return false;
    try {
      const job = await this.deadLetterQueue.getJob(dlqJobId);
      if (!job) return false;

      const dlqData = job.data as DeadLetterJobData;
      const targetQueue = this.getQueueByName(dlqData.originalQueue);

      if (targetQueue) {
        await targetQueue.add(dlqData.jobName, dlqData.data);
        await job.remove();
        this.logger.log(`Successfully retried DLQ job ${dlqJobId} into ${dlqData.originalQueue}`);
        return true;
      }
      return false;
    } catch (err) {
      this.logger.error(`Failed to retry DLQ job ${dlqJobId}: ${(err as Error).message}`);
      return false;
    }
  }

  private getQueueByName(name: string): Queue | undefined {
    switch (name) {
      case QUEUE_NOTIFICATIONS:
        return this.notificationsQueue;
      case QUEUE_MEDIA_PREVIEWS:
        return this.mediaPreviewsQueue;
      case QUEUE_SEARCH_INDEXING:
        return this.searchIndexingQueue;
      case QUEUE_MESSAGES:
        return this.messagesQueue;
      default:
        return undefined;
    }
  }

  async getQueueMetrics(): Promise<
    Array<{
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      total: number;
    }>
  > {
    const queues = [
      { name: QUEUE_NOTIFICATIONS, queue: this.notificationsQueue },
      { name: QUEUE_MEDIA_PREVIEWS, queue: this.mediaPreviewsQueue },
      { name: QUEUE_SEARCH_INDEXING, queue: this.searchIndexingQueue },
      { name: QUEUE_MESSAGES, queue: this.messagesQueue },
      { name: QUEUE_DEAD_LETTER, queue: this.deadLetterQueue },
    ];

    const results: Array<{
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      total: number;
    }> = [];

    for (const item of queues) {
      let waiting = 0;
      let active = 0;
      let completed = 0;
      let failed = 0;
      let delayed = 0;

      if (item.queue && this.connection?.status === 'ready') {
        try {
          const counts = await item.queue.getJobCounts(
            'waiting',
            'active',
            'completed',
            'failed',
            'delayed',
          );
          waiting = counts.waiting || 0;
          active = counts.active || 0;
          completed = counts.completed || 0;
          failed = counts.failed || 0;
          delayed = counts.delayed || 0;
        } catch {
          // ignore error if redis is disconnected
        }
      }

      results.push({
        name: item.name,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
      });
    }

    return results;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await Promise.all([
        this.notificationsQueue?.close().catch(() => {}),
        this.mediaPreviewsQueue?.close().catch(() => {}),
        this.searchIndexingQueue?.close().catch(() => {}),
        this.messagesQueue?.close().catch(() => {}),
        this.videoTranscodeQueue?.close().catch(() => {}),
        this.deadLetterQueue?.close().catch(() => {}),
      ]);
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
