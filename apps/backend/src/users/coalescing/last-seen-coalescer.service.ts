import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { USERS_REPOSITORY } from '../interfaces/users-repository.interface';
import type { IUsersRepository } from '../interfaces/users-repository.interface';
import { RedisService } from '../../redis/redis.service';
import { WriteCoalescer } from '../../common/coalescing';

@Injectable()
export class LastSeenCoalescerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LastSeenCoalescerService.name);
  private readonly coalescer: WriteCoalescer<string, Date>;

  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly redisService: RedisService,
  ) {
    this.coalescer = new WriteCoalescer<string, Date>({
      name: 'LastSeenCoalescer',
      flushIntervalMs: 300,
      maxBatchSize: 1000,
      mergeFn: (existing, incoming) => {
        if (!existing) return incoming;
        return existing.getTime() > incoming.getTime() ? existing : incoming;
      },
      flushHandler: async (batch) => {
        if (batch.size === 0) return;

        const records = Array.from(batch.entries()).map(([id, lastSeenAt]) => ({
          id,
          lastSeenAt,
        }));

        await this.usersRepository.updateManyLastSeen(records);

        // Batch invalidate Redis cache for updated users
        const client = this.redisService.getClient();
        if (client) {
          const pipeline = client.pipeline();
          for (const { id } of records) {
            pipeline.del(`users:${id}`);
          }
          await pipeline.exec().catch(() => {});
        }
      },
    });
  }

  /**
   * Enqueues a user's last_seen timestamp in memory for interval-based batch updating.
   */
  touchLastSeen(userId: string, when: Date = new Date()): void {
    if (!userId) return;
    this.coalescer.enqueue(userId, when);
  }

  /**
   * Immediately flushes all queued last_seen updates.
   */
  async flush(): Promise<void> {
    await this.coalescer.flush();
  }

  onModuleInit(): void {
    this.logger.log('LastSeenCoalescerService initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.coalescer.stop();
  }
}
