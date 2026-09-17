import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '@common/prisma';
import { QUEUE_NOTIFICATIONS, NotificationJobType } from '../queue.constants';
import { QueueService } from '../queue.service';
import { MessengerGateway } from '../../messenger/gateway/messenger.gateway';
import { TraceContext } from '../../common/tracing/trace-context';

export interface NotificationJobData {
  userId: string;
  type: string;
  payload: {
    actorId?: string | null;
    postId?: string | null;
    commentId?: string | null;
    text?: string | null;
    allowGrouping?: boolean;
  };
}

@Injectable()
export class NotificationsProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private worker?: Worker;
  private connection?: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessengerGateway))
    @Optional()
    private readonly gateway?: MessengerGateway,
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
        QUEUE_NOTIFICATIONS,
        async (job: Job) => {
          const notifData = job.data as NotificationJobData | undefined;
          const traceId =
            (job.data as { traceId?: string } | undefined)?.traceId ||
            `job-notif-${job.name}-${job.id ?? 'unknown'}`;
          await TraceContext.runIsolated(
            {
              traceId,
              correlationId: traceId,
              userId: notifData?.userId,
              reqMethod: 'BULLMQ_JOB',
              reqUrl: `queue:${QUEUE_NOTIFICATIONS}:${job.name}`,
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
          concurrency: 10,
          skipVersionCheck: true,
        },
      );

      this.worker.on('error', (err) => {
        this.logger.warn(`Notifications Worker Redis error: ${err.message}`);
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
      this.logger.warn(`Failed to initialize Notifications Worker: ${(err as Error).message}`);
    }
  }

  private async handleJobFailed(job: Job | undefined, err: Error): Promise<void> {
    this.logger.warn(
      `Notification job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts ?? 3}): ${err.message}`,
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

  processJob(job: Job): Promise<void> {
    const jobName = job.name;
    const notifData = job.data as NotificationJobData;

    if (
      jobName === (NotificationJobType.PUSH as string) ||
      jobName === (NotificationJobType.CREATE as string)
    ) {
      if (!notifData?.userId) return Promise.resolve();

      // Perform async notification delivery / push notification fanout
      if (this.gateway) {
        this.gateway.emitToUser(notifData.userId, 'notification:new', {
          type: notifData.type,
          payload: notifData.payload,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      this.logger.debug(`Unknown notification job type: ${jobName}`);
    }

    return Promise.resolve();
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
