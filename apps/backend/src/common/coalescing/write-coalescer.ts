import { Logger } from '@nestjs/common';

export interface WriteCoalescerOptions<K, V> {
  name?: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  mergeFn?: (existing: V | undefined, incoming: V) => V;
  flushHandler: (batch: Map<K, V>) => Promise<void>;
}

/**
 * High-performance, zero-cost write coalescer (micro-batching).
 *
 * Accumulates high-frequency updates in an in-memory Map and flushes them
 * in batches every `flushIntervalMs` (default: 250ms) or upon reaching
 * `maxBatchSize` (default: 1000 items), reducing I/O by orders of magnitude.
 */
export class WriteCoalescer<K, V> {
  private readonly logger: Logger;
  private readonly buffer = new Map<K, V>();
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private readonly mergeFn: (existing: V | undefined, incoming: V) => V;
  private readonly flushHandler: (batch: Map<K, V>) => Promise<void>;

  private timer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private isStopped = false;

  constructor(options: WriteCoalescerOptions<K, V>) {
    const name = options.name ?? 'WriteCoalescer';
    this.logger = new Logger(name);
    this.flushIntervalMs = options.flushIntervalMs ?? 250;
    this.maxBatchSize = options.maxBatchSize ?? 1000;
    this.mergeFn = options.mergeFn ?? ((_, incoming) => incoming);
    this.flushHandler = options.flushHandler;

    this.startTimer();
  }

  /**
   * Enqueues an item into the in-memory write buffer.
   * If the buffer exceeds `maxBatchSize`, triggers an immediate non-blocking flush.
   */
  enqueue(key: K, value: V): void {
    if (this.isStopped) return;

    const existing = this.buffer.get(key);
    this.buffer.set(key, this.mergeFn(existing, value));

    if (this.buffer.size >= this.maxBatchSize && !this.isFlushing) {
      void this.flush();
    }
  }

  /**
   * Flushes all currently buffered items to the persistence layer in one batch.
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.size === 0) {
      return;
    }

    this.isFlushing = true;

    // Snapshot and clear the current buffer in O(1)
    const batch = new Map<K, V>(this.buffer);
    this.buffer.clear();

    try {
      await this.flushHandler(batch);
    } catch (err) {
      this.logger.error(
        `Failed to flush micro-batch (${batch.size} items): ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      // Re-queue non-conflicting items if flush failed and not stopped
      if (!this.isStopped) {
        for (const [key, value] of batch) {
          if (!this.buffer.has(key)) {
            this.buffer.set(key, value);
          }
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Number of items currently buffered in memory.
   */
  get size(): number {
    return this.buffer.size;
  }

  private startTimer(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      if (this.buffer.size > 0 && !this.isFlushing) {
        void this.flush();
      }
    }, this.flushIntervalMs);

    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  /**
   * Stops the interval timer and flushes any remaining items in memory.
   */
  async stop(): Promise<void> {
    this.isStopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}
