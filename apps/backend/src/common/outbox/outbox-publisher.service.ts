import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '../../redis/redis.service';
import { QueueService } from '../../queue/queue.service';
import { SearchJobType, MessageJobType, NotificationJobType } from '../../queue/queue.constants';
import { MessengerGateway } from '../../messenger/gateway/messenger.gateway';
import { WS_EVENTS } from '../../messenger/events/ws-events';
import { TraceContext } from '../tracing/trace-context';
import {
  OUTBOX_REPOSITORY,
  OUTBOX_PUBLISHER_LOCK_KEY,
  OUTBOX_MAX_RETRIES,
  OUTBOX_BATCH_SIZE,
  OUTBOX_EVENT_TYPES,
} from './outbox.constants';
import type { IOutboxRepository } from './interfaces/outbox-repository.interface';
import type { OutboxEvent } from '@prisma/client';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private isRunning = false;
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepo: IOutboxRepository,
    private readonly redisService: RedisService,
    @Optional()
    private readonly queueService?: QueueService,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
    @Optional()
    @Inject(forwardRef(() => MessengerGateway))
    private readonly gateway?: MessengerGateway,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_OUTBOX_POLLER_IN_TEST) {
      this.logger.log('OutboxPublisherService polling loop skipped in test environment.');
      return;
    }
    this.isRunning = true;
    this.scheduleNextPoll(1000);
    this.logger.log('OutboxPublisherService initialized and started polling worker.');
  }

  onModuleDestroy(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private hasLoggedPollingError = false;

  private scheduleNextPoll(delayMs: number): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(() => {
      if (!this.isRunning) return;
      void (async () => {
        let nextDelay = 1000;
        try {
          if (!this.isRunning) return;
          await this.processOutboxBatch();
          this.hasLoggedPollingError = false;
        } catch (err) {
          if (!this.hasLoggedPollingError) {
            this.logger.warn(`Outbox polling paused (storage unavailable): ${String(err)}`);
            this.hasLoggedPollingError = true;
          }
          nextDelay = 5000;
        } finally {
          if (this.isRunning) {
            this.scheduleNextPoll(nextDelay);
          }
        }
      })();
    }, delayMs);

    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  async processOutboxBatch(): Promise<number> {
    const lockToken = await this.redisService.acquireLock(OUTBOX_PUBLISHER_LOCK_KEY, 8000);
    if (!lockToken) {
      return 0;
    }

    try {
      const events: OutboxEvent[] = await this.outboxRepo.claimPendingEvents(
        OUTBOX_BATCH_SIZE,
        OUTBOX_MAX_RETRIES,
      );
      if (events.length === 0) {
        return 0;
      }

      this.logger.debug(`Processing ${events.length} outbox events...`);

      for (const event of events) {
        const headers = (
          event.headers && typeof event.headers === 'object' ? event.headers : {}
        ) as Record<string, unknown>;
        const traceId =
          (typeof headers.traceId === 'string' ? headers.traceId : undefined) ||
          `outbox-${event.eventType}-${event.id}`;

        try {
          await TraceContext.runIsolated(
            {
              traceId,
              correlationId: traceId,
              reqMethod: 'OUTBOX_EVENT',
              reqUrl: `outbox:${event.aggregateType}:${event.eventType}`,
              startTime: Date.now(),
              startHrTime: process.hrtime.bigint(),
            },
            async () => {
              await this.publishEvent(event);
              await this.outboxRepo.markAsPublished(event.id);
            },
          );
        } catch (publishErr) {
          const errMsg = publishErr instanceof Error ? publishErr.message : String(publishErr);
          this.logger.error(
            `Failed to publish outbox event ${event.id} (${event.eventType}): ${errMsg}`,
          );
          await this.outboxRepo.markAsFailed(event.id, errMsg);
        }
      }

      return events.length;
    } finally {
      await this.redisService.releaseLock(OUTBOX_PUBLISHER_LOCK_KEY, lockToken);
    }
  }

  private async publishEvent(event: OutboxEvent): Promise<void> {
    const payload = (
      event.payload && typeof event.payload === 'object' ? event.payload : {}
    ) as Record<string, unknown>;

    // 1. Emit to local EventEmitter2 for in-process reactive handlers
    if (this.eventEmitter) {
      this.eventEmitter.emit(`outbox.${event.eventType}`, payload);
      this.eventEmitter.emit(`outbox.aggregate.${event.aggregateType}`, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        payload,
      });
    }

    // 2. Dispatch to external queues / brokers based on event type
    switch (event.eventType) {
      case OUTBOX_EVENT_TYPES.POST_CREATED: {
        if (this.queueService) {
          const postId = typeof payload.postId === 'string' ? payload.postId : undefined;
          const content = typeof payload.content === 'string' ? payload.content : '';
          if (postId && content) {
            await this.queueService.addSearchIndexingJob(SearchJobType.INDEX_POST, {
              id: postId,
              type: 'post',
              content,
            });

            const hashtags = content.match(/#[a-zA-Z0-9_]+/g);
            if (hashtags && hashtags.length > 0) {
              await this.queueService.addSearchIndexingJob(SearchJobType.INDEX_HASHTAG, {
                id: postId,
                type: 'hashtag',
                tags: hashtags,
              });
            }
          }
        }
        break;
      }

      case OUTBOX_EVENT_TYPES.MESSAGE_SENT: {
        if (this.queueService && payload.messageId && payload.conversationId) {
          await this.queueService.addMessageJob(MessageJobType.FANOUT, {
            messageId: payload.messageId,
            conversationId: payload.conversationId,
            senderId: payload.senderId,
          });
        }

        if (this.gateway && payload.recipientIds && Array.isArray(payload.recipientIds)) {
          for (const recipientId of payload.recipientIds as string[]) {
            this.gateway.emitToUser(recipientId, WS_EVENTS.NEW_MESSAGE, {
              conversationId: payload.conversationId,
              message: payload.messageView,
            });
          }
        }
        break;
      }

      case OUTBOX_EVENT_TYPES.NOTIFICATION_CREATED: {
        if (this.queueService && payload.userId && payload.type) {
          await this.queueService.addNotificationJob(NotificationJobType.PUSH, payload);
        }
        break;
      }

      default:
        this.logger.debug(`Generic outbox event published: ${event.eventType}`);
        break;
    }
  }
}
