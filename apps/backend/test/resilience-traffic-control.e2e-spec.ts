import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ServerHealthMonitorService } from '../src/common/resilience/server-health-monitor.service';
import { QueryComplexityService } from '../src/common/resilience/query-complexity.service';
import { AlertingService } from '../src/common/resilience/alerting.service';
import { QueueService } from '../src/queue/queue.service';
import { QUEUE_NOTIFICATIONS, QUEUE_DEAD_LETTER } from '../src/queue/queue.constants';
import { PoisonPillError } from '../src/queue/poison-pill.error';
import { type Job } from 'bullmq';

describe('Resiliency & Traffic Control (e2e)', () => {
  let app: INestApplication<App>;
  let healthMonitor: ServerHealthMonitorService;
  let complexityService: QueryComplexityService;
  let queueService: QueueService;
  let alertingService: AlertingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    healthMonitor = app.get<ServerHealthMonitorService>(ServerHealthMonitorService);
    complexityService = app.get<QueryComplexityService>(QueryComplexityService);
    queueService = app.get<QueueService>(QueueService);
    alertingService = app.get<AlertingService>(AlertingService);
  });

  afterAll(async () => {
    healthMonitor.resetSimulation();
    if (app) {
      await app.close();
    }
  });

  describe('1. Adaptive Rate Limiting & Load Shedding', () => {
    beforeEach(() => {
      healthMonitor.resetSimulation();
    });

    afterEach(() => {
      healthMonitor.resetSimulation();
    });

    it('allows low-priority and normal requests when server health is NORMAL', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/showcase/search-media?q=dota')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('sheds low-priority requests with 503 Service Unavailable + Retry-After header when DEGRADED', async () => {
      // Simulate server degradation (Event loop lag > 100ms or CPU > 85%)
      healthMonitor.setDegradedForTesting(true);

      const res = await request(app.getHttpServer())
        .get('/users/showcase/search-media?q=dota')
        .expect(503);

      expect(res.headers['retry-after']).toBe('5');
      expect(res.body).toMatchObject({
        statusCode: 503,
        errorCode: 'SERVICE_DEGRADED',
      });
      expect((res.body as { message: string }).message).toContain('Low-priority request shed');

      // But critical/normal requests (e.g. health liveness) remain accessible
      const healthRes = await request(app.getHttpServer()).get('/health/live');
      expect(healthRes.status).toBe(200);
      expect((healthRes.body as { status: string }).status).toBe('ok');
    });

    it('recovers immediately once server health returns to NORMAL', async () => {
      healthMonitor.setDegradedForTesting(true);
      await request(app.getHttpServer()).get('/users/showcase/search-media?q=dota').expect(503);

      // Server recovers
      healthMonitor.resetSimulation();

      const res = await request(app.getHttpServer())
        .get('/users/showcase/search-media?q=dota')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('2. Query Depth & Complexity Limit', () => {
    it('accepts normal payload within allowed depth and complexity limits', () => {
      const normalPayload = {
        title: 'Normal Post Title',
        content: 'This is standard depth content',
        metadata: {
          category: 'tech',
          tags: ['typescript', 'nestjs'],
        },
      };

      expect(() => {
        complexityService.validatePayload(normalPayload, 5, 500);
      }).not.toThrow();
    });

    it('rejects query depth exceeding limit of 5 with 400 QUERY_DEPTH_LIMIT_EXCEEDED', async () => {
      // Ultra-deep nested object (depth 7)
      const deepPayload = {
        email: 'test@example.com',
        password: 'password123',
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: {
                    value: 'too deep',
                  },
                },
              },
            },
          },
        },
      };

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(deepPayload)
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        errorCode: 'QUERY_DEPTH_LIMIT_EXCEEDED',
      });
      expect((res.body as { message: string }).message).toContain(
        'exceeds the maximum allowed limit of 5',
      );
    });

    it('rejects query complexity exceeding allowed complexity score limit with 400 QUERY_COMPLEXITY_LIMIT_EXCEEDED', async () => {
      // Massive cyclic-like explosive payload
      const complexObject: Record<string, unknown> = {
        email: 'test@example.com',
        password: 'password123',
      };
      for (let i = 0; i < 200; i++) {
        complexObject[`field_${i}`] = {
          sub_a: `value_${i}`,
          sub_b: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          sub_c: { inner: 'deep_complex' },
        };
      }

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(complexObject)
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        errorCode: 'QUERY_COMPLEXITY_LIMIT_EXCEEDED',
      });
      expect((res.body as { message: string }).message).toContain('Query complexity score of');
    });
  });

  describe('3. Poison Pill & Dead Letter Queue (DLQ)', () => {
    it('moves terminal failed jobs or poison pills into Dead Letter Queue with alert dispatching', async () => {
      const alertSpy = jest.spyOn(alertingService, 'sendDlqAlert').mockResolvedValue();

      const mockJob: Partial<Job> = {
        id: 'mock-job-123',
        name: 'test_poison_job',
        queueName: QUEUE_NOTIFICATIONS,
        attemptsMade: 3,
        opts: { attempts: 3 },
        data: {
          userId: 'user-dlq-1',
          type: 'MALFORMED_PAYLOAD',
        },
      };

      const poisonError = new PoisonPillError('Unrecoverable malformed JSON in job payload');

      await queueService.moveToDeadLetterQueue(mockJob as Job, poisonError, true);

      // Verify alert was triggered
      expect(alertSpy).toHaveBeenCalledTimes(1);
      const alertCall = alertSpy.mock.calls[0][0];
      expect(alertCall.jobId).toBe('mock-job-123');
      expect(alertCall.jobName).toBe('test_poison_job');
      expect(alertCall.originalQueue).toBe(QUEUE_NOTIFICATIONS);
      expect(alertCall.isPoisonPill).toBe(true);
      expect(alertCall.failedReason).toContain('Unrecoverable malformed JSON');

      alertSpy.mockRestore();
    });

    it('reports DLQ in queue metrics without blocking worker queues', async () => {
      const metrics = await queueService.getQueueMetrics();
      const dlqMetric = metrics.find((m) => m.name === QUEUE_DEAD_LETTER);

      expect(dlqMetric).toBeDefined();
      expect(dlqMetric?.name).toBe(QUEUE_DEAD_LETTER);
    });
  });
});
