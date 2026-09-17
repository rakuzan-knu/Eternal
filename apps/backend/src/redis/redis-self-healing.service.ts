import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { MetricsService } from '../metrics/metrics.service';
import { AlertingService } from '../common/resilience/alerting.service';
import type { RedisMemoryInfoDto, SelfHealResponseDto } from '@common/contracts';

export const DEFAULT_NON_CRITICAL_CACHE_PATTERNS = [
  'cache:feed:*',
  'cache:posts:*',
  'cache:users:*',
  'cache:stories:*',
  'cache:opengraph:*',
  'cache:search:*',
  'og:preview:*',
  'cache:comments:*',
];

export const PROTECTED_KEY_PREFIXES = [
  'session:',
  'auth:',
  'lock:',
  'bull:',
  'queue:',
  'throttler:',
  'outbox:',
  'idempotency:',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

@Injectable()
export class RedisSelfHealingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisSelfHealingService.name);

  private readonly defaultThresholdRatio: number;
  private readonly fallbackMaxMemoryBytes: number;
  private simulatedMemoryRatio: number | null = null;

  private lastEvictionTimestamp?: string;
  private lastEvictedKeysCount = 0;

  constructor(
    @Inject(REDIS_CLIENT) private readonly client: Redis,
    private readonly configService: ConfigService,
    @Optional() private readonly metricsService?: MetricsService,
    @Optional() private readonly alertingService?: AlertingService,
  ) {
    const rawThreshold = this.configService.get<string>('REDIS_MEMORY_EVICTION_THRESHOLD', '0.90');
    this.defaultThresholdRatio = parseFloat(rawThreshold) || 0.9;

    const rawFallbackMax = this.configService.get<string>(
      'REDIS_MAX_MEMORY_BYTES',
      '536870912', // 512 MB default fallback if maxmemory is unconfigured (0)
    );
    this.fallbackMaxMemoryBytes = parseInt(rawFallbackMax, 10) || 536_870_912;
  }

  getThresholdRatio(): number {
    return this.defaultThresholdRatio;
  }

  getLastEvictionInfo(): {
    lastEvictionTimestamp?: string | undefined;
    lastEvictedKeysCount: number;
  } {
    return {
      lastEvictionTimestamp: this.lastEvictionTimestamp,
      lastEvictedKeysCount: this.lastEvictedKeysCount,
    };
  }

  /**
   * Reads Redis memory stats from INFO memory and calculates memory utilization ratio.
   */
  async getRedisMemoryInfo(): Promise<RedisMemoryInfoDto> {
    if (this.simulatedMemoryRatio !== null) {
      const simulatedRatio = Math.min(1.0, Math.max(0, this.simulatedMemoryRatio));
      const usedBytes = Math.round(simulatedRatio * this.fallbackMaxMemoryBytes);
      return {
        usedMemoryBytes: usedBytes,
        usedMemoryHuman: formatBytes(usedBytes),
        maxMemoryBytes: this.fallbackMaxMemoryBytes,
        maxMemoryHuman: formatBytes(this.fallbackMaxMemoryBytes),
        memoryRatio: simulatedRatio,
        memoryUsagePercent: Math.round(simulatedRatio * 10000) / 100,
        isHighMemory: simulatedRatio >= this.defaultThresholdRatio,
        thresholdRatio: this.defaultThresholdRatio,
      };
    }

    try {
      const isExplicitlyDisconnected =
        this.client.status && !['ready', 'connecting', 'connect'].includes(this.client.status);

      if (isExplicitlyDisconnected || typeof this.client.info !== 'function') {
        return this.getFallbackMemoryInfo();
      }

      const infoStr = await this.client.info('memory');
      const parsedStats = this.parseRedisInfoMemory(infoStr || '');

      let maxMemory = parsedStats.maxmemory;
      if (maxMemory <= 0) {
        maxMemory = this.fallbackMaxMemoryBytes;
      }

      const usedMemory = parsedStats.used_memory;
      const actualRatio = maxMemory > 0 ? usedMemory / maxMemory : 0;
      const effectiveRatio = actualRatio;

      const isHighMemory = effectiveRatio >= this.defaultThresholdRatio;

      if (this.metricsService) {
        this.metricsService.recordRedisMemoryRatio(effectiveRatio);
      }

      return {
        usedMemoryBytes: usedMemory,
        usedMemoryHuman: formatBytes(usedMemory),
        maxMemoryBytes: maxMemory,
        maxMemoryHuman: formatBytes(maxMemory),
        memoryRatio: Math.min(1.0, Math.max(0, effectiveRatio)),
        memoryUsagePercent: Math.round(effectiveRatio * 10000) / 100,
        isHighMemory,
        thresholdRatio: this.defaultThresholdRatio,
        fragmentationRatio: parsedStats.mem_fragmentation_ratio,
        peakMemoryBytes: parsedStats.used_memory_peak,
      };
    } catch (err) {
      this.logger.warn(`Failed to inspect Redis memory info: ${(err as Error).message}`);
      return this.getFallbackMemoryInfo();
    }
  }

  /**
   * Safely evicts non-critical keys using non-blocking SCAN + UNLINK in batches.
   * Strictly preserves all protected keys (sessions, locks, auth, bull queues).
   */
  async evictNonCriticalCaches(
    reason = 'High Redis memory threshold exceeded',
    customPatterns?: string[],
  ): Promise<SelfHealResponseDto> {
    const startTime = process.hrtime.bigint();
    const memoryBefore = await this.getRedisMemoryInfo();

    const patternsToEvict =
      customPatterns && customPatterns.length > 0
        ? customPatterns.filter((p) => !this.isProtectedPattern(p))
        : DEFAULT_NON_CRITICAL_CACHE_PATTERNS;

    this.logger.warn(
      `[SELF-HEALING RUNBOOK] Starting Redis non-critical cache eviction (Reason: ${reason}, Memory: ${memoryBefore.memoryUsagePercent}% / Threshold: ${(memoryBefore.thresholdRatio * 100).toFixed(0)}%). Patterns: ${patternsToEvict.join(', ')}`,
    );

    const evictedMap = new Map<string, number>();
    let totalEvicted = 0;

    for (const pattern of patternsToEvict) {
      try {
        const count = await this.unlinkPatternInBatches(pattern);
        evictedMap.set(pattern, count);
        totalEvicted += count;

        if (this.metricsService && count > 0) {
          this.metricsService.recordRedisEviction(pattern, count, reason);
        }
      } catch (err) {
        this.logger.error(
          `Failed to evict pattern ${pattern}: ${(err as Error).message}`,
          (err as Error).stack,
        );
        evictedMap.set(pattern, 0);
      }
    }

    const evictedPatterns: Record<string, number> = Object.fromEntries(evictedMap);

    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    const memoryAfter = await this.getRedisMemoryInfo();
    const freedBytes = Math.max(0, memoryBefore.usedMemoryBytes - memoryAfter.usedMemoryBytes);

    this.lastEvictionTimestamp = new Date().toISOString();
    this.lastEvictedKeysCount = totalEvicted;

    this.logger.log(
      `[SELF-HEALING RUNBOOK COMPLETED] Evicted ${totalEvicted} keys across ${patternsToEvict.length} patterns in ${durationMs}ms. Freed: ${formatBytes(freedBytes)}. Memory: ${memoryBefore.memoryUsagePercent}% -> ${memoryAfter.memoryUsagePercent}%.`,
    );

    return {
      triggered: true,
      reason,
      evictedCount: totalEvicted,
      evictedPatterns,
      memoryBeforeBytes: memoryBefore.usedMemoryBytes,
      memoryAfterBytes: memoryAfter.usedMemoryBytes,
      freedBytes,
      memoryRatioBefore: memoryBefore.memoryRatio,
      memoryRatioAfter: memoryAfter.memoryRatio,
      durationMs,
      timestamp: this.lastEvictionTimestamp,
    };
  }

  /**
   * Health check hook: checks if threshold is exceeded and automatically executes self-healing runbook.
   */
  async checkAndSelfHeal(
    force = false,
    customThreshold?: number,
    customPatterns?: string[],
    reason?: string,
  ): Promise<SelfHealResponseDto> {
    const memoryInfo = await this.getRedisMemoryInfo();
    const thresholdToUse =
      typeof customThreshold === 'number' && customThreshold > 0
        ? customThreshold
        : this.defaultThresholdRatio;

    const shouldEvict = force || memoryInfo.memoryRatio >= thresholdToUse;

    if (!shouldEvict) {
      return {
        triggered: false,
        reason: `Memory ratio ${(memoryInfo.memoryRatio * 100).toFixed(1)}% is below threshold ${(thresholdToUse * 100).toFixed(0)}%`,
        evictedCount: 0,
        evictedPatterns: {},
        memoryBeforeBytes: memoryInfo.usedMemoryBytes,
        memoryAfterBytes: memoryInfo.usedMemoryBytes,
        freedBytes: 0,
        memoryRatioBefore: memoryInfo.memoryRatio,
        memoryRatioAfter: memoryInfo.memoryRatio,
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const triggerReason =
      reason ||
      (force
        ? 'Manual force trigger via API/Runbook'
        : `Automated HealthCheck Trigger: Redis memory ${(memoryInfo.memoryRatio * 100).toFixed(1)}% >= ${(thresholdToUse * 100).toFixed(0)}%`);

    return this.evictNonCriticalCaches(triggerReason, customPatterns);
  }

  private async unlinkPatternInBatches(pattern: string): Promise<number> {
    const isExplicitlyDisconnected =
      this.client.status && !['ready', 'connecting', 'connect'].includes(this.client.status);

    if (isExplicitlyDisconnected) {
      return 0;
    }

    let evictedForPattern = 0;

    // 1. If scanStream is available (real ioredis), use non-blocking scanStream
    if (typeof this.client.scanStream === 'function') {
      try {
        const stream = this.client.scanStream({ match: pattern, count: 200 });
        try {
          for await (const resultKeys of stream) {
            const keys = (resultKeys as string[]).filter((key) => !this.isProtectedKey(key));

            if (keys.length > 0) {
              await this.client.unlink(...keys);
              evictedForPattern += keys.length;
            }
          }
          return evictedForPattern;
        } finally {
          if (typeof stream.destroy === 'function') {
            stream.destroy();
          }
        }
      } catch {
        // Fallback to keys method
      }
    }

    // 2. Fallback to keys() method (e.g. ioredis-mock)
    if (typeof this.client.keys === 'function') {
      try {
        const matchedKeys = await this.client.keys(pattern);
        const keys = matchedKeys.filter((key) => !this.isProtectedKey(key));
        if (keys.length > 0) {
          if (typeof this.client.unlink === 'function') {
            await this.client.unlink(...keys);
          } else if (typeof this.client.del === 'function') {
            await this.client.del(...keys);
          }
          evictedForPattern += keys.length;
        }
      } catch {
        // ignore
      }
    }

    return evictedForPattern;
  }

  private isProtectedPattern(pattern: string): boolean {
    if (typeof pattern !== 'string') return true;
    if (pattern === '__proto__' || pattern === 'constructor' || pattern === 'prototype') {
      return true;
    }
    return PROTECTED_KEY_PREFIXES.some((prefix) => pattern.startsWith(prefix));
  }

  private isProtectedKey(key: string): boolean {
    return PROTECTED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
  }

  private parseRedisInfoMemory(infoStr: string): {
    used_memory: number;
    used_memory_rss: number;
    used_memory_peak: number;
    maxmemory: number;
    mem_fragmentation_ratio?: number | undefined;
  } {
    const lines = infoStr.split('\r\n');
    const map: Record<string, string> = {};

    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        map[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
      }
    }

    return {
      used_memory: parseInt(map.used_memory || '0', 10) || 0,
      used_memory_rss: parseInt(map.used_memory_rss || '0', 10) || 0,
      used_memory_peak: parseInt(map.used_memory_peak || '0', 10) || 0,
      maxmemory: parseInt(map.maxmemory || '0', 10) || 0,
      mem_fragmentation_ratio: map.mem_fragmentation_ratio
        ? parseFloat(map.mem_fragmentation_ratio)
        : undefined,
    };
  }

  private getFallbackMemoryInfo(): RedisMemoryInfoDto {
    return {
      usedMemoryBytes: 0,
      usedMemoryHuman: '0 B',
      maxMemoryBytes: this.fallbackMaxMemoryBytes,
      maxMemoryHuman: formatBytes(this.fallbackMaxMemoryBytes),
      memoryRatio: 0,
      memoryUsagePercent: 0,
      isHighMemory: false,
      thresholdRatio: this.defaultThresholdRatio,
    };
  }

  onModuleInit(): void {
    this.logger.log('RedisSelfHealingService initialized');
  }

  onModuleDestroy(): void {
    this.simulatedMemoryRatio = null;
  }

  // Simulation hooks for automated e2e testing
  setSimulatedMemoryRatioForTesting(ratio: number | null): void {
    this.simulatedMemoryRatio = ratio;
  }

  resetSimulation(): void {
    this.simulatedMemoryRatio = null;
  }
}
