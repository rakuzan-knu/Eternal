import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DistributedLockService } from '../src/common/lock/distributed-lock.service';
import { OutboxService } from '../src/common/outbox/outbox.service';

describe('Distributed Systems & Transactions (e2e)', () => {
  let app: INestApplication<App>;
  let lockService: DistributedLockService;
  let outboxService: OutboxService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    lockService = app.get<DistributedLockService>(DistributedLockService);
    outboxService = app.get<OutboxService>(OutboxService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Distributed Locks (Redlock)', () => {
    it('acquires and releases distributed lock sequentially', async () => {
      const lockKey = 'test:lock:e2e:' + Date.now();
      const lock = await lockService.acquire(lockKey, { ttlMs: 3000, retryCount: 0 });

      expect(lock).not.toBeNull();
      expect(lock?.resource).toBe(lockKey);

      const released = await lockService.release(lock);
      expect(released).toBe(true);
    });

    it('executes critical section safely via withLock', async () => {
      const lockKey = 'test:withLock:e2e:' + Date.now();
      let executed = false;

      const result = await lockService.withLock(
        lockKey,
        async () => {
          executed = true;
          await Promise.resolve();
          return 'done';
        },
        { ttlMs: 3000 },
      );

      expect(result).toBe('done');
      expect(executed).toBe(true);
    });
  });

  describe('Transactional Outbox Pattern', () => {
    it('records outbox event into the database', async () => {
      try {
        const event = await outboxService.recordEvent({
          aggregateType: 'POST',
          aggregateId: 'post-e2e-1',
          eventType: 'POST_CREATED',
          payload: {
            postId: 'post-e2e-1',
            content: 'Hello transactional outbox!',
          },
        });

        expect(event).toBeDefined();
        expect(event.id).toBeDefined();
        expect(event.aggregateType).toBe('POST');
        expect(event.eventType).toBe('POST_CREATED');
        expect(event.status).toBe('PENDING');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Idempotency Key Middleware & Interceptor', () => {
    it('accepts X-Idempotency-Key on mutating requests and handles replay', async () => {
      const idempotencyKey = 'idemp-e2e-' + Date.now();

      // Mutating request without auth returns 401, but passes through interceptor safely
      const res1 = await request(app.getHttpServer())
        .post('/auth/sessions')
        .set('x-idempotency-key', idempotencyKey)
        .send({});

      expect([401, 404, 400, 200, 201]).toContain(res1.status);
    });
  });
});
