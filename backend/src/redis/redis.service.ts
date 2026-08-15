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

  /** Deletes every key matching a glob pattern using scanStream. */
  async delByPattern(pattern: string): Promise<void> {
    try {
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      const keysToDelete: string[] = [];

      for await (const resultKeys of stream) {
        keysToDelete.push(...(resultKeys as string[]));
      }

      if (keysToDelete.length > 0) {
        await this.client.unlink(...keysToDelete);
      }
    } catch (e) {
      this.logger.error(`Redis delByPattern failed for pattern ${pattern}: ${String(e)}`);
    }
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
      this.logger.warn(`Redis set failed for ${key}: ${String(e)}`);
    }

    return value;
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]> {
    return this.client.zrangebyscore(key, min, max);
  }

  async zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
    return this.client.zremrangebyrank(key, start, stop);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async scard(key: string): Promise<number> {
    return this.client.scard(key);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async geoadd(key: string, longitude: number, latitude: number, member: string): Promise<number> {
    try {
      return await this.client.geoadd(key, longitude, latitude, member);
    } catch (e) {
      this.logger.warn(`Redis geoadd failed: ${String(e)}`);
      return 0;
    }
  }

  async geodist(
    key: string,
    member1: string,
    member2: string,
    unit: 'm' | 'km' = 'km',
  ): Promise<number | null> {
    try {
      const geoClient = this.client as unknown as {
        geodist: (k: string, m1: string, m2: string, u: string) => Promise<string | number | null>;
      };
      const dist = await geoClient.geodist(key, member1, member2, unit);
      return dist !== null && dist !== undefined ? parseFloat(String(dist)) : null;
    } catch (e) {
      this.logger.warn(`Redis geodist failed: ${String(e)}`);
      return null;
    }
  }

  async geosearchMembers(
    key: string,
    longitude: number,
    latitude: number,
    radiusKm: number,
    count = 30,
  ): Promise<string[]> {
    try {
      const geoClient = this.client as unknown as {
        geosearch: (
          k: string,
          from: string,
          lon: number,
          lat: number,
          by: string,
          radius: number,
          u: string,
          order: string,
          countFlag: string,
          cnt: number,
        ) => Promise<string[]>;
      };
      const results: unknown = await geoClient.geosearch(
        key,
        'FROMLONLAT',
        longitude,
        latitude,
        'BYRADIUS',
        radiusKm,
        'km',
        'ASC',
        'COUNT',
        count,
      );
      return Array.isArray(results) ? (results as string[]) : [];
    } catch {
      try {
        const fallbackClient = this.client as unknown as {
          georadius: (
            k: string,
            lon: number,
            lat: number,
            radius: number,
            u: string,
            countFlag: string,
            cnt: number,
            order: string,
          ) => Promise<string[]>;
        };
        const results: unknown = await fallbackClient.georadius(
          key,
          longitude,
          latitude,
          radiusKm,
          'km',
          'COUNT',
          count,
          'ASC',
        );
        return Array.isArray(results) ? (results as string[]) : [];
      } catch (e) {
        this.logger.warn(`Redis geosearch/georadius failed: ${String(e)}`);
        return [];
      }
    }
  }

  async dismissSuggestedUser(viewerId: string, targetId: string): Promise<void> {
    try {
      await this.client
        .multi()
        .sadd(`user:dismissed_suggestions:${viewerId}`, targetId)
        .expire(`user:dismissed_suggestions:${viewerId}`, 2592000)
        .exec();
    } catch (e) {
      this.logger.warn(`Redis dismissSuggestedUser failed: ${String(e)}`);
    }
  }
}
