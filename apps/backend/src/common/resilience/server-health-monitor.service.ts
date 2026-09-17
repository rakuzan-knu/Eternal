import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'node:os';
import { monitorEventLoopDelay, type IntervalHistogram } from 'node:perf_hooks';
import * as v8 from 'node:v8';

export enum ServerDegradationState {
  NORMAL = 'NORMAL',
  DEGRADED = 'DEGRADED',
  CRITICAL = 'CRITICAL',
}

export interface ServerHealthStatus {
  state: ServerDegradationState;
  eventLoopDelayMs: number;
  cpuUsagePercent: number;
  heapUsageRatio: number;
  isDegraded: boolean;
  isCritical: boolean;
  thresholds: {
    eventLoopDelayDegradedMs: number;
    eventLoopDelayCriticalMs: number;
    cpuDegradedPercent: number;
    cpuCriticalPercent: number;
    heapDegradedRatio: number;
  };
}

@Injectable()
export class ServerHealthMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServerHealthMonitorService.name);

  private histogram?: IntervalHistogram | undefined;
  private monitorInterval?: NodeJS.Timeout | undefined;

  private lastCpuUsage = process.cpuUsage();
  private lastCpuTime = process.hrtime.bigint();
  private currentCpuPercent = 0;
  private currentEventLoopDelayMs = 0;
  private currentHeapRatio = 0;

  // Thresholds
  private readonly eventLoopDelayDegradedMs: number;
  private readonly eventLoopDelayCriticalMs: number;
  private readonly cpuDegradedPercent: number;
  private readonly cpuCriticalPercent: number;
  private readonly heapDegradedRatio: number;

  // Startup warm-up grace period: 20 seconds to prevent cold-start false positives
  private readonly warmupUntil = Date.now() + 20_000;
  private consecutiveDegradedCycles = 0;
  private consecutiveCriticalCycles = 0;

  // Test simulation overrides
  private simulationState: ServerDegradationState | null = null;

  constructor(private readonly configService: ConfigService) {
    this.eventLoopDelayDegradedMs = parseFloat(
      this.configService.get<string>('LOAD_SHED_EVENT_LOOP_DELAY_MS', '100'),
    );
    this.eventLoopDelayCriticalMs = parseFloat(
      this.configService.get<string>('LOAD_SHED_EVENT_LOOP_CRITICAL_MS', '250'),
    );
    this.cpuDegradedPercent = parseFloat(
      this.configService.get<string>('LOAD_SHED_CPU_DEGRADED_PERCENT', '85'),
    );
    this.cpuCriticalPercent = parseFloat(
      this.configService.get<string>('LOAD_SHED_CPU_CRITICAL_PERCENT', '95'),
    );
    this.heapDegradedRatio = parseFloat(
      this.configService.get<string>('LOAD_SHED_HEAP_DEGRADED_RATIO', '0.90'),
    );
  }

  onModuleInit(): void {
    try {
      this.histogram = monitorEventLoopDelay({ resolution: 20 });
      this.histogram.enable();
    } catch (err) {
      this.logger.warn(`Could not enable event loop delay histogram: ${(err as Error).message}`);
    }

    this.monitorInterval = setInterval(() => {
      this.sampleServerHealth();
    }, 1000);

    if (this.monitorInterval && typeof this.monitorInterval.unref === 'function') {
      this.monitorInterval.unref();
    }

    this.logger.log(
      `ServerHealthMonitorService initialized (Degraded thresholds: EventLoop > ${this.eventLoopDelayDegradedMs}ms, CPU > ${this.cpuDegradedPercent}%, Heap > ${(this.heapDegradedRatio * 100).toFixed(0)}%)`,
    );
  }

  private sampleServerHealth(): void {
    // 1. Sample Event Loop Delay (95th percentile with EWMA smoothing)
    if (this.histogram) {
      const p95Nano = this.histogram.percentile(95);
      const instantDelayMs = p95Nano > 0 ? p95Nano / 1e6 : 0;
      this.currentEventLoopDelayMs =
        this.currentEventLoopDelayMs === 0
          ? instantDelayMs
          : this.currentEventLoopDelayMs * 0.6 + instantDelayMs * 0.4;
      this.histogram.reset();
    }

    // 2. Sample CPU Usage
    const now = process.hrtime.bigint();
    const elapsedMicros = Number(now - this.lastCpuTime) / 1000;
    if (elapsedMicros > 0) {
      const currentUsage = process.cpuUsage(this.lastCpuUsage);
      const totalCpuTimeMicros = currentUsage.user + currentUsage.system;
      const numCores = os.cpus().length || 1;

      // Normalized percentage 0..100% across all cores
      this.currentCpuPercent = Math.min(
        100,
        Math.max(0, (totalCpuTimeMicros / (elapsedMicros * numCores)) * 100),
      );

      this.lastCpuUsage = process.cpuUsage();
      this.lastCpuTime = now;
    }

    // 3. Sample Heap Usage
    try {
      const heapStats = v8.getHeapStatistics();
      this.currentHeapRatio =
        heapStats.heap_size_limit > 0 ? heapStats.used_heap_size / heapStats.heap_size_limit : 0;
    } catch {
      this.currentHeapRatio = 0;
    }
  }

  getHealthStatus(): ServerHealthStatus {
    let state = ServerDegradationState.NORMAL;

    if (this.simulationState) {
      state = this.simulationState;
    } else if (Date.now() >= this.warmupUntil) {
      const isCritical =
        this.currentEventLoopDelayMs >= this.eventLoopDelayCriticalMs ||
        this.currentCpuPercent >= this.cpuCriticalPercent;

      const isDegraded =
        this.currentEventLoopDelayMs >= this.eventLoopDelayDegradedMs ||
        this.currentCpuPercent >= this.cpuDegradedPercent ||
        this.currentHeapRatio >= this.heapDegradedRatio;

      if (isCritical) {
        this.consecutiveCriticalCycles++;
      } else {
        this.consecutiveCriticalCycles = 0;
      }

      if (isDegraded) {
        this.consecutiveDegradedCycles++;
      } else {
        this.consecutiveDegradedCycles = 0;
      }

      if (this.consecutiveCriticalCycles >= 2) {
        state = ServerDegradationState.CRITICAL;
      } else if (this.consecutiveDegradedCycles >= 2) {
        state = ServerDegradationState.DEGRADED;
      }
    }

    return {
      state,
      eventLoopDelayMs: this.currentEventLoopDelayMs,
      cpuUsagePercent: this.currentCpuPercent,
      heapUsageRatio: this.currentHeapRatio,
      isDegraded:
        state === ServerDegradationState.DEGRADED || state === ServerDegradationState.CRITICAL,
      isCritical: state === ServerDegradationState.CRITICAL,
      thresholds: {
        eventLoopDelayDegradedMs: this.eventLoopDelayDegradedMs,
        eventLoopDelayCriticalMs: this.eventLoopDelayCriticalMs,
        cpuDegradedPercent: this.cpuDegradedPercent,
        cpuCriticalPercent: this.cpuCriticalPercent,
        heapDegradedRatio: this.heapDegradedRatio,
      },
    };
  }

  isDegraded(): boolean {
    return this.getHealthStatus().isDegraded;
  }

  isCritical(): boolean {
    return this.getHealthStatus().isCritical;
  }

  // Testing hooks to simulate load states
  setDegradedForTesting(degraded: boolean): void {
    this.simulationState = degraded ? ServerDegradationState.DEGRADED : null;
  }

  setCriticalForTesting(critical: boolean): void {
    this.simulationState = critical ? ServerDegradationState.CRITICAL : null;
  }

  isSimulationActive(): boolean {
    return this.simulationState !== null;
  }

  resetSimulation(): void {
    this.simulationState = null;
  }

  onModuleDestroy(): void {
    if (this.histogram) {
      try {
        this.histogram.disable();
      } catch {
        // ignore on teardown
      }
    }
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
  }
}
