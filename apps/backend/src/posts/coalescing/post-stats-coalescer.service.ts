import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { POSTS_REPOSITORY } from '../interfaces/posts-repository.interface';
import type { IPostRepository } from '../interfaces/posts-repository.interface';
import { WriteCoalescer } from '../../common/coalescing';

@Injectable()
export class PostStatsCoalescerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostStatsCoalescerService.name);
  private readonly coalescer: WriteCoalescer<string, number>;

  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: IPostRepository,
  ) {
    this.coalescer = new WriteCoalescer<string, number>({
      name: 'PostStatsCoalescer',
      flushIntervalMs: 250,
      maxBatchSize: 1000,
      mergeFn: (existing = 0, incoming) => existing + incoming,
      flushHandler: async (batch) => {
        if (batch.size === 0) return;

        const entries = Array.from(batch.entries()).map(([postId, count]) => ({
          postId,
          count,
        }));

        await this.postsRepository.incrementManyShareCounts(entries);
      },
    });
  }

  /**
   * Buffers a share count increment for a post.
   */
  incrementShareCount(postId: string, delta = 1): void {
    if (!postId || delta <= 0) return;
    this.coalescer.enqueue(postId, delta);
  }

  /**
   * Immediately flushes queued post increments.
   */
  async flush(): Promise<void> {
    await this.coalescer.flush();
  }

  onModuleInit(): void {
    this.logger.log('PostStatsCoalescerService initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.coalescer.stop();
  }
}
