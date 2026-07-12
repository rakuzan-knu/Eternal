import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const safeTtl = Math.max(1, Math.floor(ttlSeconds));
    await this.client.set(key, value, 'EX', safeTtl);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.client.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch (e) {
      this.logger.warn(`Redis get failed for ${key}: ${String(e)}`);
    }
    const value = await loader();
    const ttl = ttlSeconds + Math.floor(Math.random() * 15);
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (e) {
      this.logger.warn(`Redis get failed for ${key}: ${String(e)}`);
    }
    return value;
  }
}
