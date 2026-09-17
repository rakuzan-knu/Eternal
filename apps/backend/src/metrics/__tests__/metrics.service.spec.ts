import { MetricsService } from '../metrics.service';
import * as promClient from 'prom-client';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { QueueService } from '../../queue/queue.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let mockPrismaService: Partial<PrismaService>;
  let mockQueueService: Partial<QueueService>;

  beforeEach(() => {
    promClient.register.clear();
    mockPrismaService = {
      getPoolMetrics: jest.fn().mockReturnValue({
        total: 10,
        idle: 6,
        active: 4,
        waiting: 1,
      }),
    };
    mockQueueService = {
      getQueueMetrics: jest.fn().mockResolvedValue([
        {
          name: 'notifications',
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 1,
          delayed: 0,
          total: 7,
        },
      ]),
    };
    service = new MetricsService(
      mockPrismaService as PrismaService,
      mockQueueService as QueueService,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
    promClient.register.clear();
  });

  it('getMetrics returns prometheus metrics text with DB and Queue stats', async () => {
    service.recordHttpRequest('GET', '/api/posts', 200, 150);
    service.recordHttpError('POST', '/api/auth/login', 401);
    service.incrementActiveConnections();
    service.decrementActiveConnections();
    service.recordDatabaseQuery('findUnique', 'User', 25);
    service.recordRedisOperation('GET', 5);

    const customCollector = jest.fn();
    service.registerCollector(customCollector);

    const metrics = await service.getMetrics();

    expect(typeof metrics).toBe('string');
    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('http_requests_errors_total');
    expect(metrics).toContain('http_request_duration_seconds');
    expect(metrics).toContain('database_query_duration_seconds');
    expect(metrics).toContain('db_connections');
    expect(metrics).toContain('bullmq_queue_jobs');
    expect(metrics).toContain('bullmq_queue_size_total');
    expect(metrics).toContain('app_event_loop_lag_seconds');
    expect(metrics).toContain('app_memory_heap_used_bytes');
    expect(metrics).toContain('app_memory_heap_limit_bytes');
    expect(metrics).toContain('app_memory_heap_utilization_ratio');
    expect(metrics).toContain('websocket_connections_active');
    expect(customCollector).toHaveBeenCalled();

    service.unregisterCollector(customCollector);
  });

  it('handles absence of optional prisma and queue services gracefully', async () => {
    promClient.register.clear();
    const standaloneService = new MetricsService();
    const metrics = await standaloneService.getMetrics();
    expect(typeof metrics).toBe('string');
    standaloneService.onModuleDestroy();
  });

  it('cleans up uptime interval on onModuleDestroy', () => {
    expect(() => service.onModuleDestroy()).not.toThrow();
  });
});
