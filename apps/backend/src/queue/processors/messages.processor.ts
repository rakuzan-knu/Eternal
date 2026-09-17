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
import { QUEUE_MESSAGES, MessageJobType } from '../queue.constants';
import { QueueService } from '../queue.service';
import { MessengerGateway } from '../../messenger/gateway/messenger.gateway';
import {
  CONVERSATIONS_REPOSITORY,
  type IConversationsRepository,
} from '../../messenger/interfaces/conversations-repository.interface';
import { TraceContext } from '../../common/tracing/trace-context';

export interface MessageFanoutJobData {
  conversationId: string;
  senderId: string;
  messageId: string;
  recipientIds: string[];
  snippet: string;
}

export interface GlobalEntityFanoutJobData {
  conversationId: string;
  event: string;
  payload: unknown;
  excludedUserId?: string;
  recipientIds?: string[];
}

@Injectable()
export class MessagesProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagesProcessor.name);
  private worker?: Worker;
  private connection?: Redis;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CONVERSATIONS_REPOSITORY)
    @Optional()
    private readonly convsRepo?: IConversationsRepository,
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
        QUEUE_MESSAGES,
        async (job: Job) => {
          const traceId =
            (job.data as { traceId?: string } | undefined)?.traceId ||
            `job-msg-${job.name}-${job.id ?? 'unknown'}`;
          await TraceContext.runIsolated(
            {
              traceId,
              correlationId: traceId,
              reqMethod: 'BULLMQ_JOB',
              reqUrl: `queue:${QUEUE_MESSAGES}:${job.name}`,
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
        this.logger.warn(`Messages Worker Redis error: ${err.message}`);
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
      this.logger.warn(`Failed to initialize Messages Worker: ${(err as Error).message}`);
    }
  }

  private async handleJobFailed(job: Job | undefined, err: Error): Promise<void> {
    this.logger.warn(
      `Message job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts ?? 3}): ${err.message}`,
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

    if (jobName === (MessageJobType.GLOBAL_ENTITY_FANOUT as string)) {
      await this.processGlobalEntityFanout(job.data as GlobalEntityFanoutJobData);
      return;
    }

    const msgData = job.data as MessageFanoutJobData;

    if (
      jobName === (MessageJobType.FANOUT as string) ||
      jobName === (MessageJobType.NOTIFY_OFFLINE as string)
    ) {
      if (!msgData?.recipientIds || msgData.recipientIds.length === 0) {
        return;
      }
      this.logger.debug(
        `Async processed message fanout for conversation ${msgData.conversationId} to ${msgData.recipientIds.length} recipients`,
      );
    } else {
      this.logger.debug(`Unknown message job type: ${jobName}`);
    }
  }

  private async processGlobalEntityFanout(data: GlobalEntityFanoutJobData): Promise<void> {
    const { conversationId, event, payload, excludedUserId } = data;
    let recipientIds = data.recipientIds;

    if (!recipientIds || recipientIds.length === 0) {
      if (this.convsRepo) {
        recipientIds = await this.convsRepo.findParticipantIds(conversationId);
      }
    }

    if (!recipientIds || recipientIds.length === 0) return;

    if (excludedUserId) {
      recipientIds = recipientIds.filter((id) => id !== excludedUserId);
    }

    if (recipientIds.length === 0) return;

    // Presence prioritization: divide recipients into online vs offline
    const onlineRecipients: string[] = [];
    const offlineRecipients: string[] = [];

    if (this.connection && recipientIds.length > 0) {
      const presenceChunkSize = 250;
      for (let i = 0; i < recipientIds.length; i += presenceChunkSize) {
        const batch = recipientIds.slice(i, i + presenceChunkSize);
        const pipeline = this.connection.pipeline();
        for (const uid of batch) {
          pipeline.get(`user:presence:${uid}`);
        }
        const results = await pipeline.exec().catch(() => null);
        if (results) {
          for (let j = 0; j < batch.length; j++) {
            const [, status] = results[j] || [];
            if (status === 'online') {
              onlineRecipients.push(batch[j]);
            } else {
              offlineRecipients.push(batch[j]);
            }
          }
        } else {
          offlineRecipients.push(...batch);
        }
      }
    } else {
      onlineRecipients.push(...recipientIds);
    }

    this.logger.log(
      `Thundering herd mitigation: Dispatching '${event}' for conv ${conversationId} to ${onlineRecipients.length} online, ${offlineRecipients.length} offline recipients`,
    );

    // Batch 1: Immediate dispatch to active online sessions
    if (this.gateway && onlineRecipients.length > 0) {
      for (const uid of onlineRecipients) {
        this.gateway.emitToUser(uid, event, payload);
      }
    }

    // Batch 2+: Paced chunking to offline / dormant users
    const OFFLINE_CHUNK_SIZE = 1000;
    for (let i = 0; i < offlineRecipients.length; i += OFFLINE_CHUNK_SIZE) {
      const chunk = offlineRecipients.slice(i, i + OFFLINE_CHUNK_SIZE);
      if (this.gateway) {
        for (const uid of chunk) {
          this.gateway.emitToUser(uid, event, payload);
        }
      }
      if (i + OFFLINE_CHUNK_SIZE < offlineRecipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
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
