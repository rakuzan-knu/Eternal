import {
  forwardRef,
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import * as promClient from 'prom-client';
import * as v8 from 'node:v8';
import {
  monitorEventLoopDelay,
  performance,
  type IntervalHistogram,
  type EventLoopUtilization,
} from 'node:perf_hooks';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { MemoryMonitorService } from '../common/memory/memory-monitor.service';

export type MetricCollectorFn = () => Promise<void> | void;

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private httpRequestDuration!: promClient.Histogram;
  private httpRequestTotal!: promClient.Counter;
  private httpRequestErrors!: promClient.Counter;
  private activeConnections!: promClient.Gauge;
  private databaseQueryDuration!: promClient.Histogram;
  private redisOperationDuration!: promClient.Histogram;
  private processUptime!: promClient.Gauge;

  // DB Connection Pool metrics
  private dbConnections!: promClient.Gauge<string>;

  // BullMQ Queue metrics
  private bullmqQueueJobs!: promClient.Gauge<string>;
  private bullmqQueueTotal!: promClient.Gauge<string>;

  // Event loop lag & memory gauges
  private eventLoopLag!: promClient.Gauge;
  private eventLoopLagP95!: promClient.Gauge;
  private eventLoopLagP99!: promClient.Gauge;
  private eventLoopLagMax!: promClient.Gauge;
  private eventLoopUtilization!: promClient.Gauge;
  private memoryHeapUsed!: promClient.Gauge;
  private memoryHeapTotal!: promClient.Gauge;
  private memoryHeapLimit!: promClient.Gauge;
  private memoryHeapRatio!: promClient.Gauge;
  private memoryHeapSpaceSize!: promClient.Gauge<string>;
  private memoryHeapSpaceUsed!: promClient.Gauge<string>;
  private memoryHeapDumpsTotal!: promClient.Gauge;

  // Load Shedding and DLQ metrics
  private loadShedRequestsTotal!: promClient.Counter<string>;
  private dlqJobsTotal!: promClient.Counter<string>;

  // API Versioning and Deprecation metrics
  private deprecatedApiRequestsTotal!: promClient.Counter<string>;

  // Self-Healing and Deadlock metrics
  private redisMemoryRatioGauge!: promClient.Gauge;
  private redisEvictedKeysTotal!: promClient.Counter<string>;
  private deadlockSuspectsTotal!: promClient.Counter<string>;
  private redisConnectedGauge!: promClient.Gauge;

  private elDelayHistogram?: IntervalHistogram | undefined;
  private lastElu?: EventLoopUtilization | undefined;

  private uptimeInterval?: NodeJS.Timeout | undefined;
  private customCollectors: Set<MetricCollectorFn> = new Set();

  constructor(
    @Inject(forwardRef(() => PrismaService))
    @Optional()
    private readonly prismaService?: PrismaService,
    @Inject(forwardRef(() => QueueService))
    @Optional()
    private readonly queueService?: QueueService,
    @Inject(forwardRef(() => MemoryMonitorService))
    @Optional()
    private readonly memoryMonitorService?: MemoryMonitorService,
  ) {
    this.initializeMetrics();
    this.setupDefaultMetrics();
  }

  private initializeMetrics(): void {
    // HTTP Request Duration (in seconds)
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    // HTTP Request Total
    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // HTTP Errors
    this.httpRequestErrors = new promClient.Counter({
      name: 'http_requests_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_code'],
    });

    // Active WebSocket Connections
    this.activeConnections = new promClient.Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
    });

    // Database Query Duration
    this.databaseQueryDuration = new promClient.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    // Redis Operation Duration
    this.redisOperationDuration = new promClient.Histogram({
      name: 'redis_operation_duration_seconds',
      help: 'Duration of Redis operations',
      labelNames: ['command'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
    });

    // Process Uptime
    this.processUptime = new promClient.Gauge({
      name: 'process_uptime_seconds',
      help: 'Application uptime in seconds',
    });

    // Database Connection Pool Status
    this.dbConnections = new promClient.Gauge({
      name: 'db_connections',
      help: 'Database connection pool metrics (active, idle, total, waiting)',
      labelNames: ['state'],
    });

    // BullMQ Queue Status
    this.bullmqQueueJobs = new promClient.Gauge({
      name: 'bullmq_queue_jobs',
      help: 'BullMQ queue job counts by status',
      labelNames: ['queue', 'status'],
    });

    this.bullmqQueueTotal = new promClient.Gauge({
      name: 'bullmq_queue_size_total',
      help: 'Total number of active/waiting/delayed jobs in BullMQ queue',
      labelNames: ['queue'],
    });

    // Explicit Event loop lag & memory gauges
    this.eventLoopLag = new promClient.Gauge({
      name: 'app_event_loop_lag_seconds',
      help: 'Instantaneous event loop lag in seconds',
    });

    this.eventLoopLagP95 = new promClient.Gauge({
      name: 'app_event_loop_lag_p95_seconds',
      help: 'Event loop lag 95th percentile in seconds',
    });

    this.eventLoopLagP99 = new promClient.Gauge({
      name: 'app_event_loop_lag_p99_seconds',
      help: 'Event loop lag 99th percentile in seconds',
    });

    this.eventLoopLagMax = new promClient.Gauge({
      name: 'app_event_loop_lag_max_seconds',
      help: 'Event loop lag maximum delay in seconds',
    });

    this.eventLoopUtilization = new promClient.Gauge({
      name: 'app_event_loop_utilization_ratio',
      help: 'Event loop utilization ratio (0.0 to 1.0)',
    });

    this.memoryHeapUsed = new promClient.Gauge({
      name: 'app_memory_heap_used_bytes',
      help: 'V8 heap memory used in bytes',
    });

    this.memoryHeapTotal = new promClient.Gauge({
      name: 'app_memory_heap_total_bytes',
      help: 'V8 heap memory total allocated in bytes',
    });

    this.memoryHeapLimit = new promClient.Gauge({
      name: 'app_memory_heap_limit_bytes',
      help: 'V8 maximum heap memory limit in bytes',
    });

    this.memoryHeapRatio = new promClient.Gauge({
      name: 'app_memory_heap_utilization_ratio',
      help: 'Ratio of used heap to maximum heap size limit (0.0 to 1.0)',
    });

    this.memoryHeapSpaceSize = new promClient.Gauge({
      name: 'nodejs_heap_space_size_bytes',
      help: 'V8 heap space allocated size in bytes',
      labelNames: ['space'],
    });

    this.memoryHeapSpaceUsed = new promClient.Gauge({
      name: 'nodejs_heap_space_used_bytes',
      help: 'V8 heap space used size in bytes',
      labelNames: ['space'],
    });

    this.memoryHeapDumpsTotal = new promClient.Gauge({
      name: 'app_memory_heap_dumps_total',
      help: 'Total number of V8 heap snapshots captured',
    });

    this.loadShedRequestsTotal = new promClient.Counter({
      name: 'app_load_shed_requests_total',
      help: 'Total number of low-priority or normal requests shed due to server load',
      labelNames: ['priority', 'route', 'method'],
    });

    this.dlqJobsTotal = new promClient.Counter({
      name: 'bullmq_dlq_jobs_total',
      help: 'Total number of failed jobs routed to Dead Letter Queue',
      labelNames: ['queue', 'job_type', 'is_poison_pill'],
    });

    this.deprecatedApiRequestsTotal = new promClient.Counter({
      name: 'app_deprecated_api_requests_total',
      help: 'Total number of requests made to deprecated API endpoints or versions',
      labelNames: ['method', 'route', 'api_version', 'client_type', 'client_version', 'is_mobile'],
    });

    this.redisMemoryRatioGauge = new promClient.Gauge({
      name: 'app_redis_memory_utilization_ratio',
      help: 'Redis memory utilization ratio (0.0 to 1.0)',
    });

    this.redisEvictedKeysTotal = new promClient.Counter({
      name: 'app_redis_evicted_keys_total',
      help: 'Total number of keys evicted by self-healing runbook',
      labelNames: ['pattern', 'reason'],
    });

    this.deadlockSuspectsTotal = new promClient.Counter({
      name: 'app_deadlock_suspects_total',
      help: 'Total number of requests aborted due to hard application deadlock / timeout',
      labelNames: ['method', 'route', 'handler'],
    });

    this.redisConnectedGauge = new promClient.Gauge({
      name: 'app_redis_connected',
      help: 'Redis connection status (1 = connected, 0 = disconnected)',
    });
  }

  private setupDefaultMetrics(): void {
    try {
      this.elDelayHistogram = monitorEventLoopDelay({ resolution: 20 });
      this.elDelayHistogram.enable();
      this.lastElu = performance.eventLoopUtilization();
    } catch {
      // ignore if perf_hooks delay histogram fails to enable
    }

    // Collect Node.js default metrics (includes nodejs_eventloop_lag_seconds, nodejs_heap_size_used_bytes, etc.)
    promClient.collectDefaultMetrics({
      prefix: 'nodejs_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Update uptime, memory and event loop metrics periodically
    this.uptimeInterval = setInterval(() => {
      this.collectInternalMetrics();
    }, 5000);

    if (this.uptimeInterval && typeof this.uptimeInterval.unref === 'function') {
      this.uptimeInterval.unref();
    }
  }

  private collectInternalMetrics(): void {
    this.processUptime.set(process.uptime());

    const mem = process.memoryUsage();
    this.memoryHeapUsed.set(mem.heapUsed);
    this.memoryHeapTotal.set(mem.heapTotal);

    try {
      const heapStats = v8.getHeapStatistics();
      this.memoryHeapLimit.set(heapStats.heap_size_limit);
      if (heapStats.heap_size_limit > 0) {
        this.memoryHeapRatio.set(heapStats.used_heap_size / heapStats.heap_size_limit);
      }

      const heapSpaces = v8.getHeapSpaceStatistics();
      for (const space of heapSpaces) {
        this.memoryHeapSpaceSize.set({ space: space.space_name }, space.space_size);
        this.memoryHeapSpaceUsed.set({ space: space.space_name }, space.space_used_size);
      }
    } catch {
      // ignore v8 stats collection error if not available
    }

    if (this.memoryMonitorService) {
      this.memoryHeapDumpsTotal.set(this.memoryMonitorService.getDumpCount());
    }

    // Measure event loop lag and utilization from perf_hooks
    try {
      if (this.lastElu) {
        const elu = performance.eventLoopUtilization(this.lastElu);
        this.eventLoopUtilization.set(elu.utilization);
        this.lastElu = performance.eventLoopUtilization();
      }
      if (this.elDelayHistogram) {
        const p95Nano = this.elDelayHistogram.percentile(95);
        const p99Nano = this.elDelayHistogram.percentile(99);
        const maxNano = this.elDelayHistogram.max;
        this.eventLoopLagP95.set(p95Nano > 0 ? p95Nano / 1e9 : 0);
        this.eventLoopLagP99.set(p99Nano > 0 ? p99Nano / 1e9 : 0);
        this.eventLoopLagMax.set(maxNano > 0 ? maxNano / 1e9 : 0);
        this.elDelayHistogram.reset();
      }
    } catch {
      // ignore
    }

    // Instantaneous event loop lag measurement using high-precision monotonic timer
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      this.eventLoopLag.set(lag);
    });
  }

  registerCollector(fn: MetricCollectorFn): void {
    this.customCollectors.add(fn);
  }

  unregisterCollector(fn: MetricCollectorFn): void {
    this.customCollectors.delete(fn);
  }

  private async collectExternalMetrics(): Promise<void> {
    this.collectInternalMetrics();

    // Collect DB pool metrics
    if (this.prismaService?.getPoolMetrics) {
      const pool = this.prismaService.getPoolMetrics();
      if (pool) {
        this.dbConnections.set({ state: 'active' }, pool.active);
        this.dbConnections.set({ state: 'idle' }, pool.idle);
        this.dbConnections.set({ state: 'total' }, pool.total);
        this.dbConnections.set({ state: 'waiting' }, pool.waiting);
      }
    }

    // Collect Queue metrics
    if (this.queueService?.getQueueMetrics) {
      const queueMetrics = await this.queueService.getQueueMetrics();
      for (const q of queueMetrics) {
        this.bullmqQueueJobs.set({ queue: q.name, status: 'waiting' }, q.waiting);
        this.bullmqQueueJobs.set({ queue: q.name, status: 'active' }, q.active);
        this.bullmqQueueJobs.set({ queue: q.name, status: 'completed' }, q.completed);
        this.bullmqQueueJobs.set({ queue: q.name, status: 'failed' }, q.failed);
        this.bullmqQueueJobs.set({ queue: q.name, status: 'delayed' }, q.delayed);
        this.bullmqQueueTotal.set({ queue: q.name }, q.total);
      }
    }

    // Run any custom registered collectors
    for (const collector of this.customCollectors) {
      try {
        await collector();
      } catch {
        // ignore collector errors during scrape
      }
    }
  }

  async getMetrics(): Promise<string> {
    await this.collectExternalMetrics();
    return promClient.register.metrics();
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration / 1000, // Convert to seconds
    );
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
  }

  recordHttpError(method: string, route: string, errorCode: number): void {
    this.httpRequestErrors.inc({ method, route, error_code: errorCode });
  }

  incrementActiveConnections(): void {
    this.activeConnections.inc();
  }

  decrementActiveConnections(): void {
    this.activeConnections.dec();
  }

  recordDatabaseQuery(operation: string, table: string, duration: number): void {
    this.databaseQueryDuration.observe(
      { operation, table },
      duration / 1000, // Convert to seconds
    );
  }

  recordRedisOperation(command: string, duration: number): void {
    this.redisOperationDuration.observe(
      { command },
      duration / 1000, // Convert to seconds
    );
  }

  recordLoadShedRequest(priority: string, route: string, method: string): void {
    this.loadShedRequestsTotal.inc({ priority, route, method });
  }

  recordDlqJob(queue: string, jobType: string, isPoisonPill: boolean): void {
    this.dlqJobsTotal.inc({
      queue,
      job_type: jobType,
      is_poison_pill: isPoisonPill ? 'true' : 'false',
    });
  }

  recordDeprecatedApiRequest(params: {
    method: string;
    route: string;
    apiVersion?: string | undefined;
    clientType?: string | undefined;
    clientVersion?: string | undefined;
    isMobile?: boolean | undefined;
  }): void {
    this.deprecatedApiRequestsTotal.inc({
      method: params.method,
      route: params.route,
      api_version: params.apiVersion || 'unversioned',
      client_type: params.clientType || 'unknown',
      client_version: params.clientVersion || 'unknown',
      is_mobile: params.isMobile ? 'true' : 'false',
    });
  }

  recordRedisConnected(connected: boolean): void {
    this.redisConnectedGauge.set(connected ? 1 : 0);
  }

  recordRedisMemoryRatio(ratio: number): void {
    this.redisMemoryRatioGauge.set(Math.max(0, ratio));
  }

  recordRedisEviction(pattern: string, count: number, reason = 'threshold_exceeded'): void {
    if (count > 0) {
      this.redisEvictedKeysTotal.inc({ pattern, reason }, count);
    }
  }

  recordDeadlockSuspect(method: string, route: string, handler = 'unknown'): void {
    this.deadlockSuspectsTotal.inc({ method, route, handler });
  }

  onModuleInit(): void {
    this.collectInternalMetrics();
  }

  onModuleDestroy(): void {
    if (this.elDelayHistogram) {
      try {
        this.elDelayHistogram.disable();
      } catch {
        // ignore
      }
      this.elDelayHistogram = undefined;
    }
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
      this.uptimeInterval = undefined;
    }
    this.customCollectors.clear();
  }
}
