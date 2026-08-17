import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { type HealthResponseDto, type PingResponseDto } from '@common/contracts';
import { HealthRepository } from './health.repository';

@Injectable()
export class HealthService {
  constructor(
    private readonly healthRepository: HealthRepository,
    private readonly redisService: RedisService,
  ) {}

  getLiveness(): PingResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<{ isHealthy: boolean; response: HealthResponseDto }> {
    const [dbOk, redisOk] = await Promise.all([
      this.healthRepository.pingDatabase(),
      this.checkRedis(),
    ]);

    const isHealthy = dbOk && redisOk;

    const response: HealthResponseDto = {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbOk ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
      },
    };

    return { isHealthy, response };
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const pingPromise = this.redisService.getClient().ping();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis ping timeout')), 1500),
      );
      await Promise.race([pingPromise, timeoutPromise]);
      return true;
    } catch {
      return false;
    }
  }
}
