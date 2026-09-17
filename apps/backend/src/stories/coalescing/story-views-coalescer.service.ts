import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { StoriesRepository } from '../stories.repository';
import { WriteCoalescer } from '../../common/coalescing';

export interface StoryViewEntry {
  storyId: string;
  viewerId: string;
  viewedAt: Date;
}

@Injectable()
export class StoryViewsCoalescerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StoryViewsCoalescerService.name);
  private readonly coalescer: WriteCoalescer<string, StoryViewEntry>;

  constructor(private readonly storiesRepo: StoriesRepository) {
    this.coalescer = new WriteCoalescer<string, StoryViewEntry>({
      name: 'StoryViewsCoalescer',
      flushIntervalMs: 250,
      maxBatchSize: 1000,
      mergeFn: (existing, incoming) => incoming,
      flushHandler: async (batch) => {
        if (batch.size === 0) return;

        const views = Array.from(batch.values());
        await this.storiesRepo.recordManyViews(views);
      },
    });
  }

  /**
   * Buffers a story view record for batch insertion.
   */
  recordView(storyId: string, viewerId: string, viewedAt: Date = new Date()): void {
    if (!storyId || !viewerId) return;
    const key = `${storyId}:${viewerId}`;
    this.coalescer.enqueue(key, { storyId, viewerId, viewedAt });
  }

  /**
   * Immediately flushes queued story views.
   */
  async flush(): Promise<void> {
    await this.coalescer.flush();
  }

  onModuleInit(): void {
    this.logger.log('StoryViewsCoalescerService initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.coalescer.stop();
  }
}
