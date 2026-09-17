import { Global, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { ThrottlerStorageRedisService } from './throttler-storage-redis.service';
import { RedisBloomFilterService } from './redis-bloom-filter.service';
import { REDIS_CLIENT } from './redis.constants';

import { RedisSelfHealingService } from './redis-self-healing.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        const logger = new Logger('RedisModule');
        const url = configService.get<string>('REDIS_URL');
        if (
          url?.startsWith('memory://') ||
          process.env.REDIS_IN_MEMORY === 'true' ||
          process.env.NODE_ENV === 'test'
        ) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const inMemoryModule = require('../../test/in-memory-db') as {
              createInMemoryRedisClient: () => Redis;
            };
            logger.log('Redis initialized in in-memory mode (ioredis-mock).');
            return inMemoryModule.createInMemoryRedisClient();
          } catch {
            // fallback to standard client
          }
        }
        const client = new Redis(url as string, {
          maxRetriesPerRequest: 2,
          connectTimeout: 2000,
          retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 1000)),
        });
        let hasLoggedError = false;
        client.on('error', (err: Error) => {
          if (!hasLoggedError) {
            logger.warn(
              `Redis connection error (${err.message || 'ECONNREFUSED'}). Operating in graceful fallback mode.`,
            );
            hasLoggedError = true;
          }
        });
        client.on('ready', () => {
          hasLoggedError = false;
          logger.log('Redis connected successfully.');
          const policy = configService.get<string>('REDIS_MAXMEMORY_POLICY') || 'allkeys-lru';
          if (typeof client.call === 'function') {
            client
              .call('CONFIG', 'SET', 'maxmemory-policy', policy)
              .then(() => logger.log(`Redis maxmemory-policy set to ${policy}`))
              .catch((err: Error) => {
                logger.debug(
                  `Could not configure Redis maxmemory-policy (${err.message}). Defaulting to server configuration.`,
                );
              });
          }
        });
        return client;
      },
    },
    RedisService,
    ThrottlerStorageRedisService,
    RedisBloomFilterService,
    RedisSelfHealingService,
  ],
  exports: [
    RedisService,
    ThrottlerStorageRedisService,
    RedisBloomFilterService,
    RedisSelfHealingService,
  ],
})
export class RedisModule implements OnModuleDestroy {
  constructor(private readonly redisService: RedisService) {}

  async onModuleDestroy(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (
        client.status === 'ready' ||
        client.status === 'connecting' ||
        client.status === 'connect'
      ) {
        await client.quit();
      } else {
        client.disconnect();
      }
    } catch {
      // ignore on teardown
    }
  }
}
