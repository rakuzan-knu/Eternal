import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('REDIS_URL');
        return new Redis(url as string, {
          maxRetriesPerRequest: 2,
          connectTimeout: 2000,
          retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 1000)),
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService],
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
