import { Injectable, Logger, Optional } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { RedisSelfHealingService } from '../redis/redis-self-healing.service';
import { MemoryLeakDetectorService } from '../common/memory/memory-leak-detector.service';
import { ServerHealthMonitorService } from '../common/resilience/server-health-monitor.service';
import { MetricsService } from '../metrics/metrics.service';
import {
  type HealthResponseDto,
  type PingResponseDto,
  type RedisMemoryInfoDto,
  type SelfHealResponseDto,
  type SelfHealTriggerDto,
  type SelfHealingStatusDto,
} from '@common/contracts';
import { HealthRepository } from './health.repository';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly healthRepository: HealthRepository,
    private readonly redisService: RedisService,
    private readonly redisSelfHealingService: RedisSelfHealingService,
    @Optional()
    private readonly memoryLeakDetector?: MemoryLeakDetectorService,
    @Optional()
    private readonly serverHealthMonitor?: ServerHealthMonitorService,
    @Optional()
    private readonly metricsService?: MetricsService,
  ) {}

  getLiveness(): PingResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<{ isHealthy: boolean; response: HealthResponseDto }> {
    const [dbOk, redisOk, memoryInfo] = await Promise.all([
      this.healthRepository.pingDatabase(),
      this.checkRedis(),
      this.redisSelfHealingService.getRedisMemoryInfo(),
    ]);

    if (this.metricsService) {
      this.metricsService.recordRedisConnected(redisOk);
    }

    const memoryOk = this.memoryLeakDetector ? this.memoryLeakDetector.isReadyForTraffic() : true;
    const isHealthy = dbOk && redisOk && memoryOk;

    // Automated self-healing trigger: if Redis memory exceeds threshold (e.g. 90%), execute runbook
    if (memoryInfo.isHighMemory) {
      this.logger.warn(
        `[HEALTH CHECK ALERT] Redis memory high (${memoryInfo.memoryUsagePercent}% >= ${(memoryInfo.thresholdRatio * 100).toFixed(0)}%). Executing automated self-healing runbook...`,
      );
      void this.redisSelfHealingService.checkAndSelfHeal(
        false,
        memoryInfo.thresholdRatio,
        undefined,
        `Automated HealthCheck Trigger (Memory at ${memoryInfo.memoryUsagePercent}%)`,
      );
    }

    const lastEviction = this.redisSelfHealingService.getLastEvictionInfo();
    const selfHealing: SelfHealingStatusDto = {
      status: memoryInfo.isHighMemory ? 'triggered' : 'idle',
      redisMemoryRatio: memoryInfo.memoryRatio,
      redisEvictedKeys: lastEviction.lastEvictedKeysCount,
      lastTriggeredAt: lastEviction.lastEvictionTimestamp,
      actionsExecuted: lastEviction.lastEvictionTimestamp ? ['EVICT_NON_CRITICAL_CACHE_KEYS'] : [],
    };

    const healthStatus = this.serverHealthMonitor?.getHealthStatus();
    const mem = process.memoryUsage();
    const elLag = healthStatus?.eventLoopDelayMs ?? 0;
    const isMemoryCritical = mem.heapUsed / mem.heapTotal > 0.95;
    const isMemoryWarning = mem.heapUsed / mem.heapTotal > 0.85;

    const resources = {
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        status: isMemoryCritical
          ? ('critical' as const)
          : isMemoryWarning
            ? ('warning' as const)
            : ('ok' as const),
      },
      eventLoopLag: {
        lagMs: Math.round(elLag * 100) / 100,
        status:
          elLag >= 100
            ? ('critical' as const)
            : elLag >= 30
              ? ('warning' as const)
              : ('ok' as const),
      },
      connections: {
        database: dbOk ? 'connected' : 'disconnected',
        redis: redisOk ? 'connected' : 'disconnected',
      },
    };

    const response: HealthResponseDto = {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbOk ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
      },
      selfHealing,
      resources,
    };

    return { isHealthy, response };
  }

  async getRedisMemoryInfo(): Promise<RedisMemoryInfoDto> {
    return this.redisSelfHealingService.getRedisMemoryInfo();
  }

  async triggerSelfHealing(dto?: SelfHealTriggerDto): Promise<SelfHealResponseDto> {
    return this.redisSelfHealingService.checkAndSelfHeal(
      dto?.force ?? true,
      dto?.threshold,
      dto?.patterns,
      dto?.reason,
    );
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const pingPromise = this.redisService.getClient().ping();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis ping timeout')), 1500),
      );
      await Promise.race([pingPromise, timeoutPromise]);
      return true;
    } catch (e) {
      this.logger.warn(`Redis readiness check failed: ${String(e)}`);
      return false;
    }
  }
}
