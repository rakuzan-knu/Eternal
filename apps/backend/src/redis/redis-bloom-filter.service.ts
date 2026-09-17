import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisBloomFilterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisBloomFilterService.name);

  // Bit array size: 1,048,576 bits (131 KB per filter)
  // Provides < 0.1% false positive probability for up to ~100,000 items with k = 7
  private readonly filterSize: number = 1048576;
  private readonly hashCount: number = 7;
  private readonly localFallback = new Map<string, Set<number>>();

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  private isRedisActive(): boolean {
    return this.client.status === 'ready' || this.client.status === 'connect';
  }

  /**
   * Adds an item (e.g. jti or userId) to the Redis Bloom Filter.
   */
  async add(filterKey: string, item: string, ttlSeconds = 86400 * 7): Promise<void> {
    if (!item) return;
    const offsets = this.getBitOffsets(item);

    let localSet = this.localFallback.get(filterKey);
    if (!localSet) {
      localSet = new Set<number>();
      this.localFallback.set(filterKey, localSet);
    }
    for (const offset of offsets) {
      localSet.add(offset);
    }

    if (!this.isRedisActive()) return;

    try {
      const pipeline = this.client.pipeline();

      for (const offset of offsets) {
        pipeline.setbit(filterKey, offset, 1);
      }

      if (ttlSeconds > 0) {
        pipeline.expire(filterKey, Math.max(1, Math.floor(ttlSeconds)));
      }

      await pipeline.exec();
    } catch (err) {
      this.logger.warn(`RedisBloomFilter add failed for ${filterKey}: ${(err as Error).message}`);
    }
  }

  /**
   * Adds multiple items in a single atomic pipeline roundtrip.
   */
  async addMany(filterKey: string, items: string[], ttlSeconds = 86400 * 7): Promise<void> {
    if (!items || items.length === 0) return;

    let localSet = this.localFallback.get(filterKey);
    if (!localSet) {
      localSet = new Set<number>();
      this.localFallback.set(filterKey, localSet);
    }

    for (const item of items) {
      if (!item) continue;
      const offsets = this.getBitOffsets(item);
      for (const offset of offsets) {
        localSet.add(offset);
      }
    }

    if (!this.isRedisActive()) return;

    try {
      const pipeline = this.client.pipeline();

      for (const item of items) {
        if (!item) continue;
        const offsets = this.getBitOffsets(item);
        for (const offset of offsets) {
          pipeline.setbit(filterKey, offset, 1);
        }
      }

      if (ttlSeconds > 0) {
        pipeline.expire(filterKey, Math.max(1, Math.floor(ttlSeconds)));
      }

      await pipeline.exec();
    } catch (err) {
      this.logger.warn(
        `RedisBloomFilter addMany failed for ${filterKey}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Checks if an item might be in the Bloom Filter.
   * - Returns false: Item is GUARANTEED not to be in the set (0 DB queries needed).
   * - Returns true: Item is LIKELY in the set (< 0.1% false positive).
   */
  async has(filterKey: string, item: string): Promise<boolean> {
    if (!item) return false;
    const offsets = this.getBitOffsets(item);

    if (!this.isRedisActive()) {
      const localSet = this.localFallback.get(filterKey);
      if (!localSet) return false;
      for (const offset of offsets) {
        if (!localSet.has(offset)) {
          return false;
        }
      }
      return true;
    }

    try {
      const pipeline = this.client.pipeline();

      for (const offset of offsets) {
        pipeline.getbit(filterKey, offset);
      }

      const results = await pipeline.exec();
      if (!results) {
        const localSet = this.localFallback.get(filterKey);
        if (!localSet) return false;
        return offsets.every((o) => localSet.has(o));
      }

      // If ANY bit is 0, item is definitely not in the set
      for (const [err, bit] of results) {
        if (err || bit === 0) {
          return false;
        }
      }

      return true;
    } catch (err) {
      this.logger.warn(`RedisBloomFilter has failed for ${filterKey}: ${(err as Error).message}`);
      const localSet = this.localFallback.get(filterKey);
      if (!localSet) return false;
      return offsets.every((o) => localSet.has(o));
    }
  }

  /**
   * Clears the Bloom Filter key.
   */
  async clear(filterKey: string): Promise<void> {
    this.localFallback.delete(filterKey);
    if (!this.isRedisActive()) return;
    try {
      await this.client.del(filterKey);
    } catch (err) {
      this.logger.warn(`RedisBloomFilter clear failed for ${filterKey}: ${(err as Error).message}`);
    }
  }

  /**
   * Computes k uniform bit offsets using Kirsch-Mitzenmacher double hashing from SHA-256 digest.
   * g_i(x) = (h1(x) + i * h2(x) + i^2) % m
   */
  private getBitOffsets(item: string): number[] {
    const hash = createHash('sha256').update(item).digest();
    const h1 = hash.readUInt32BE(0);
    const h2 = hash.readUInt32BE(4);

    const offsets: number[] = [];
    const m = BigInt(this.filterSize);

    for (let i = 0; i < this.hashCount; i++) {
      const offsetBig = (BigInt(h1) + BigInt(i) * BigInt(h2) + BigInt(i * i)) % m;
      offsets.push(Number(offsetBig));
    }

    return offsets;
  }

  onModuleInit(): void {
    this.logger.log('RedisBloomFilterService initialized');
  }

  onModuleDestroy(): void {
    this.localFallback.clear();
  }
}
