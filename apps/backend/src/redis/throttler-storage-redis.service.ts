import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

export type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

const THROTTLE_LUA_SCRIPT = `
local key = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local isBlocked = redis.call('EXISTS', blockKey)
if isBlocked == 1 then
  local blockTtl = redis.call('PTTL', blockKey)
  local keyTtl = redis.call('PTTL', key)
  local hits = tonumber(redis.call('GET', key) or (limit + 1))
  return { hits, math.max(0, keyTtl), 1, math.max(0, blockTtl) }
end

local hits = redis.call('INCR', key)
if hits == 1 then
  redis.call('PEXPIRE', key, ttl)
end
local keyTtl = redis.call('PTTL', key)
if keyTtl < 0 then
  redis.call('PEXPIRE', key, ttl)
  keyTtl = ttl
end

if hits > limit then
  if blockDuration > 0 then
    redis.call('SET', blockKey, '1', 'PX', blockDuration)
    return { hits, math.max(0, keyTtl), 1, math.max(0, blockDuration) }
  else
    return { hits, math.max(0, keyTtl), 1, math.max(0, keyTtl) }
  end
end

return { hits, math.max(0, keyTtl), 0, 0 }
`;

@Injectable()
export class ThrottlerStorageRedisService
  implements ThrottlerStorage, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ThrottlerStorageRedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  onModuleInit(): void {
    this.logger.log('ThrottlerStorageRedisService initialized');
  }

  onModuleDestroy(): void {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:${throttlerName}:${key}:blocked`;

    try {
      if (
        this.client.status !== 'ready' &&
        this.client.status !== 'connecting' &&
        this.client.status !== 'connect'
      ) {
        return this.fallback(ttl);
      }

      const rawResult = await this.client.eval(
        THROTTLE_LUA_SCRIPT,
        2,
        redisKey,
        blockKey,
        ttl,
        limit,
        blockDuration,
      );

      const result = rawResult as [number, number, number, number];
      const totalHits = Number(result[0]);
      const timeToExpireMs = Number(result[1]);
      const isBlocked = Number(result[2]) === 1;
      const timeToBlockExpireMs = Number(result[3]);

      return {
        totalHits,
        timeToExpire: Math.max(1, Math.ceil(timeToExpireMs / 1000)),
        isBlocked,
        timeToBlockExpire: Math.max(0, Math.ceil(timeToBlockExpireMs / 1000)),
      };
    } catch (err) {
      this.logger.warn(
        `Redis throttler increment failed for key ${redisKey}: ${err instanceof Error ? err.message : String(err)}. Degraded to fail-open fallback.`,
      );
      return this.fallback(ttl);
    }
  }

  private fallback(ttl: number): ThrottlerStorageRecord {
    return {
      totalHits: 1,
      timeToExpire: Math.max(1, Math.ceil(ttl / 1000)),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
