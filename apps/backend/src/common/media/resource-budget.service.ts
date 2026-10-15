import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { runsBackground } from '../../config/service-role';
import { RedisService } from '../../redis/redis.service';
import { ResourceUsageRepository } from './resource-usage.repository';

/** One hourly probe on Core's existing connections; no extra Redis clients or paid API keys. */
@Injectable()
export class ResourceBudgetService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ResourceBudgetService.name);
  constructor(
    private readonly usage: ResourceUsageRepository,
    private readonly redis: RedisService,
  ) {}
  async onApplicationBootstrap(): Promise<void> {
    await this.check();
  }
  @Cron('0 * * * *')
  async check(): Promise<void> {
    if (!runsBackground('core') || process.env.NODE_ENV === 'test') return;
    try {
      const bytes = await this.usage.databaseBytes();
      if (bytes >= 400_000_000)
        this.logger.warn({
          resource: 'postgres',
          bytes,
          threshold: 400_000_000,
          message:
            'Database approaching the Supabase Free quota; review usage before it becomes read-only',
        });
      const client = this.redis.getClient();
      if (client.status !== 'ready') {
        this.logger.warn('Resource budget probe: Redis unavailable');
        return;
      }
      const info = await client.info('memory');
      const used = Number(info.match(/^used_memory:(\d+)/m)?.[1] || 0);
      const max = Number(info.match(/^maxmemory:(\d+)/m)?.[1] || 0);
      if (max > 0 && used >= max * 0.8)
        this.logger.warn({
          resource: 'redis',
          usedBytes: used,
          maxBytes: max,
          message:
            'Redis memory above 80%; admission counters may be evicted under the existing LRU policy',
        });
      const clients = await client.info('clients');
      const connected = Number(clients.match(/^connected_clients:(\d+)/m)?.[1] || 0);
      if (connected >= 26)
        this.logger.warn({
          resource: 'redis-connections',
          connected,
          limit: 30,
          message: 'Stagger deployments; Redis connection budget is nearly exhausted',
        });
    } catch {
      this.logger.warn('Resource budget probe unavailable; review provider dashboards');
    }
  }
}
