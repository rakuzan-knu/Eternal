import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoryMonitorService } from './memory-monitor.service';
import { RedisService } from '../../redis/redis.service';

export interface MemorySample {
  timestamp: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  rssBytes: number;
}

export interface MemoryLeakStatus {
  isReady: boolean;
  consecutiveIncreases: number;
  requiredConsecutiveIncreases: number;
  currentHeapUsedMb: number;
  lastLeakDetectedAt?: string | undefined;
  actionTaken?: string | undefined;
  historySampleCount: number;
}

/**
 * Automatic Memory Leak Detector with Self-Healing Heap Control.
 *
 * Continuously samples process.memoryUsage().heapUsed. If memory grows monotonically
 * for N consecutive inspection cycles without relief after Garbage Collection (GC):
 * 1. Logs an emergency error diagnostic with a full stack trace.
 * 2. Writes an automated V8 heap snapshot for post-mortem debugging.
 * 3. Clears internal in-memory application caches (Map, Set, LRU fallback caches).
 * 4. Gracefully signals the orchestrator (readinessProbe = false, HTTP 503)
 *    so the node is rotated without abruptly severing active client requests.
 */
@Injectable()
export class MemoryLeakDetectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryLeakDetectorService.name);

  private checkInterval?: NodeJS.Timeout | undefined;
  private readonly intervalMs: number;
  private readonly requiredConsecutiveIncreases: number;
  private readonly minHeapUsedBytes: number;
  private readonly minDeltaBytes: number;
  private readonly gracePeriodMs: number;
  private readonly startTime = Date.now();
  private readonly cacheCleaners: Array<() => void> = [];

  private samples: MemorySample[] = [];
  private consecutiveIncreases = 0;
  private isReady = true;
  private lastLeakDetectedAt?: string | undefined;
  private actionTaken?: string | undefined;
  private simulatedLeak = false;
  private lastEmergencyTriggerTimestamp = 0;
  private readonly emergencyCooldownMs = 300_000; // 5 mins

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly memoryMonitor?: MemoryMonitorService,
    @Optional() private readonly redisService?: RedisService,
  ) {
    const rawInterval = this.configService.get<string>('MEMORY_LEAK_CHECK_INTERVAL_MS', '30000');
    this.intervalMs = Math.max(500, parseInt(rawInterval, 10) || 30_000);

    const rawConsecutive = this.configService.get<string>('MEMORY_LEAK_CONSECUTIVE_INCREASES', '5');
    this.requiredConsecutiveIncreases = Math.max(3, parseInt(rawConsecutive, 10) || 5);

    // Minimum baseline heap required before considering memory growth as a critical leak (default: 300MB)
    const defaultMinHeap = process.env.NODE_ENV === 'test' ? '0' : '300';
    const rawMinHeapMb = this.configService.get<string>('MEMORY_LEAK_MIN_HEAP_MB', defaultMinHeap);
    this.minHeapUsedBytes = Math.max(0, parseInt(rawMinHeapMb, 10) || 0) * 1024 * 1024;

    // Minimum increase per cycle required to consider it significant growth rather than allocation jitter (default: 2MB)
    const defaultMinDelta = process.env.NODE_ENV === 'test' ? '0.1' : '2';
    const rawMinDeltaMb = this.configService.get<string>(
      'MEMORY_LEAK_MIN_DELTA_MB',
      defaultMinDelta,
    );
    this.minDeltaBytes = Math.max(10 * 1024, (parseFloat(rawMinDeltaMb) || 0.1) * 1024 * 1024);

    // Startup grace period in ms (default: 2 minutes)
    const defaultGraceMs = process.env.NODE_ENV === 'test' ? '0' : '120000';
    const rawGraceMs = this.configService.get<string>(
      'MEMORY_LEAK_GRACE_PERIOD_MS',
      defaultGraceMs,
    );
    this.gracePeriodMs = Math.max(0, parseInt(rawGraceMs, 10) || 0);
  }

  onModuleInit(): void {
    // Register Redis fallback cache cleaner if available
    if (this.redisService) {
      this.registerCacheCleaner(() => {
        this.redisService?.clearFallbackCache();
        this.logger.log('[Self-Healing] Redis In-Memory Fallback LRU Cache cleared.');
      });
    }

    this.checkInterval = setInterval(() => {
      void this.sampleAndAnalyze();
    }, this.intervalMs);

    if (this.checkInterval && typeof this.checkInterval.unref === 'function') {
      this.checkInterval.unref();
    }

    this.logger.log(
      `Memory leak detector initialized (Interval: ${Math.round(this.intervalMs / 1000)}s, Monotonic Threshold: ${this.requiredConsecutiveIncreases} cycles)`,
    );
  }

  onModuleDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * Registers custom in-memory cache clearing handlers (Map, Set, LRU).
   */
  registerCacheCleaner(cleaner: () => void): void {
    this.cacheCleaners.push(cleaner);
  }

  isReadyForTraffic(): boolean {
    if (this.simulatedLeak) return false;
    return this.isReady;
  }

  getLeakStatus(): MemoryLeakStatus {
    const mem = process.memoryUsage();
    return {
      isReady: this.isReadyForTraffic(),
      consecutiveIncreases: this.consecutiveIncreases,
      requiredConsecutiveIncreases: this.requiredConsecutiveIncreases,
      currentHeapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      lastLeakDetectedAt: this.lastLeakDetectedAt,
      actionTaken: this.actionTaken,
      historySampleCount: this.samples.length,
    };
  }

  /**
   * Samples heap usage and evaluates growth trend.
   */
  async sampleAndAnalyze(): Promise<void> {
    const mem = process.memoryUsage();
    const currentSample: MemorySample = {
      timestamp: Date.now(),
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      rssBytes: mem.rss,
    };

    const previousSample = this.samples[this.samples.length - 1];
    this.samples.push(currentSample);

    // Keep sliding window of last 20 samples
    if (this.samples.length > 20) {
      this.samples.shift();
    }

    if (!previousSample) {
      return;
    }

    // Skip analysis during initial startup and warmup grace period
    if (this.gracePeriodMs > 0 && Date.now() - this.startTime < this.gracePeriodMs) {
      return;
    }

    // If current heap is below minimum baseline (e.g. 300MB), heap is within safe operating range
    if (this.minHeapUsedBytes > 0 && currentSample.heapUsedBytes < this.minHeapUsedBytes) {
      this.consecutiveIncreases = 0;
      return;
    }

    // Evaluate monotonic heap growth
    const heapDelta = currentSample.heapUsedBytes - previousSample.heapUsedBytes;
    if (heapDelta >= this.minDeltaBytes) {
      this.consecutiveIncreases++;
      this.logger.debug?.(
        `Heap increased monotonically (${this.consecutiveIncreases}/${this.requiredConsecutiveIncreases}): +${(heapDelta / (1024 * 1024)).toFixed(2)}MB`,
      );
    } else if (heapDelta <= 0) {
      // Memory dropped or stayed flat - monotonic growth chain is broken
      this.consecutiveIncreases = 0;
    }

    if (this.consecutiveIncreases >= this.requiredConsecutiveIncreases) {
      const increases = this.consecutiveIncreases;
      this.consecutiveIncreases = 0;
      await this.handleSuspectedLeak(currentSample, increases);
    }
  }

  private async handleSuspectedLeak(
    currentSample: MemorySample,
    consecutiveIncreases = this.requiredConsecutiveIncreases,
  ): Promise<void> {
    // 1. Attempt manual GC if --expose-gc is enabled
    const globalGc = (global as { gc?: () => void }).gc;
    if (typeof globalGc === 'function') {
      try {
        globalGc();
        const postGcMem = process.memoryUsage();
        // If GC released at least 15% of heap, consider it reclaimed
        if (postGcMem.heapUsed < currentSample.heapUsedBytes * 0.85) {
          this.logger.log(
            `[Self-Healing] GC successfully recovered ${(
              (currentSample.heapUsedBytes - postGcMem.heapUsed) /
              (1024 * 1024)
            ).toFixed(1)}MB. Leak alert dismissed.`,
          );
          this.consecutiveIncreases = 0;
          return;
        }
      } catch (err) {
        this.logger.warn(`Manual GC trigger failed: ${(err as Error).message}`);
      }
    }

    // Check emergency cooldown to prevent spamming snapshots and alerts
    const now = Date.now();
    if (now - this.lastEmergencyTriggerTimestamp < this.emergencyCooldownMs) {
      return;
    }
    this.lastEmergencyTriggerTimestamp = now;

    // 2. Unrecoverable growth confirmed: Trigger Emergency Protocol
    const heapUsedMb = (currentSample.heapUsedBytes / (1024 * 1024)).toFixed(1);
    const emergencyError = new Error(
      `CRITICAL_MEMORY_LEAK: heapUsed grew monotonically for ${consecutiveIncreases} intervals to ${heapUsedMb}MB without GC release`,
    );

    this.logger.error(
      `[EMERGENCY MEMORY LEAK DETECTED] Process heap usage has grown monotonically without GC drop. Emergency self-healing protocol triggered.`,
      emergencyError.stack,
    );

    this.lastLeakDetectedAt = new Date().toISOString();
    this.actionTaken = 'CLEARED_CACHES_AND_REVOKED_READINESS';

    // 3. Clear all internal application caches
    this.clearApplicationCaches();

    // 4. Capture V8 Heap Snapshot if monitor is available
    if (this.memoryMonitor) {
      await this.memoryMonitor.takeHeapDump('Automatic Memory Leak Detector Emergency Snapshot');
    }

    // 5. Revoke readiness to signal orchestrator for graceful pod rotation
    this.isReady = false;
    this.logger.warn(
      `[ORCHESTRATOR ALERT] readinessProbe set to FALSE (readiness=503). Signaling orchestrator for graceful zero-downtime container rotation.`,
    );
  }

  private clearApplicationCaches(): void {
    for (const cleaner of this.cacheCleaners) {
      try {
        cleaner();
      } catch (err) {
        this.logger.warn(`Failed to execute cache cleaner: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Simulation support for testing and verification.
   */
  simulateMemoryLeak(): void {
    this.simulatedLeak = true;
    this.isReady = false;
    this.lastLeakDetectedAt = new Date().toISOString();
    this.actionTaken = 'SIMULATED_MEMORY_LEAK';
  }

  resetSimulation(): void {
    this.simulatedLeak = false;
    this.isReady = true;
    this.consecutiveIncreases = 0;
    this.lastLeakDetectedAt = undefined;
    this.actionTaken = undefined;
    this.lastEmergencyTriggerTimestamp = 0;
  }
}
