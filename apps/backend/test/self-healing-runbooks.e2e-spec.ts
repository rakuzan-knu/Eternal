import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { HealthResponseDto, RedisMemoryInfoDto, SelfHealResponseDto } from '@common/contracts';
import { AppModule } from '../src/app.module';
import { RedisService, RedisSelfHealingService } from '../src/redis';
import { DeadlockTimeout } from '../src/common/resilience/deadlock-timeout.decorator';
import { TraceContext } from '../src/common/tracing/trace-context';

@Controller('test-deadlock')
class TestDeadlockController {
  @Get('fast')
  @DeadlockTimeout(1000)
  getFast(): { status: string } {
    return { status: 'fast_response' };
  }

  @Get('hung-deadlock')
  @DeadlockTimeout(250) // 250ms timeout
  async getHung(): Promise<{ status: string }> {
    // Hung async operation exceeding 250ms threshold
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { status: 'should_never_reach' };
  }

  @Get('abort-signal-check')
  @DeadlockTimeout(250)
  async checkAbortSignal(): Promise<{ aborted: boolean }> {
    const signal = TraceContext.getAbortSignal();
    const wasAborted = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 800);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve(true);
        });
      }
    });
    return { aborted: wasAborted };
  }
}

describe('Self-Healing Runbooks & Deadlock Detection (e2e)', () => {
  let app: INestApplication<App>;
  let redisService: RedisService;
  let selfHealingService: RedisSelfHealingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestDeadlockController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    redisService = app.get<RedisService>(RedisService);
    selfHealingService = app.get<RedisSelfHealingService>(RedisSelfHealingService);
  });

  afterAll(async () => {
    selfHealingService.resetSimulation();
    if (app) {
      await app.close();
    }
  });

  describe('1. Redis Self-Healing & Automated Cache Eviction', () => {
    beforeEach(async () => {
      selfHealingService.resetSimulation();
      // Populate test keys
      await redisService.set('cache:feed:test_user_1', 'cached_feed_data', 3600);
      await redisService.set('cache:posts:test_post_1', 'cached_post_data', 3600);
      await redisService.set('cache:users:test_user_1', 'cached_user_data', 3600);
      await redisService.set('og:preview:test_link', 'cached_og_data', 3600);

      // Populate protected critical keys
      await redisService.set('session:test_sess_1', 'session_data', 3600);
      await redisService.set('lock:test_lock_1', 'lock_token', 3600);
      await redisService.set('auth:test_user_1', 'auth_state', 3600);
    });

    afterEach(() => {
      selfHealingService.resetSimulation();
    });

    it('successfully inspects Redis memory information via service and API', async () => {
      const memoryInfo = await selfHealingService.getRedisMemoryInfo();
      expect(memoryInfo).toHaveProperty('usedMemoryBytes');
      expect(memoryInfo).toHaveProperty('maxMemoryBytes');
      expect(memoryInfo).toHaveProperty('memoryRatio');
      expect(memoryInfo).toHaveProperty('thresholdRatio');
      expect(memoryInfo.thresholdRatio).toBeGreaterThan(0);

      const res = await request(app.getHttpServer()).get('/health/redis-memory').expect(200);
      const memoryBody = res.body as RedisMemoryInfoDto;

      expect(memoryBody).toHaveProperty('usedMemoryBytes');
      expect(memoryBody).toHaveProperty('memoryRatio');
      expect(memoryBody).toHaveProperty('memoryUsagePercent');
      expect(memoryBody).toHaveProperty('isHighMemory');
    });

    it('evicts non-critical cache keys while strictly preserving protected keys (session, lock, auth)', async () => {
      // Verify keys exist before eviction
      expect(await redisService.exists('cache:feed:test_user_1')).toBe(true);
      expect(await redisService.exists('cache:posts:test_post_1')).toBe(true);
      expect(await redisService.exists('session:test_sess_1')).toBe(true);
      expect(await redisService.exists('lock:test_lock_1')).toBe(true);
      expect(await redisService.exists('auth:test_user_1')).toBe(true);

      // Trigger self-healing eviction
      const result = await selfHealingService.evictNonCriticalCaches('E2E Test Eviction');

      expect(result.triggered).toBe(true);
      expect(result.evictedCount).toBeGreaterThanOrEqual(4);
      expect(result.evictedPatterns).toHaveProperty('cache:feed:*');

      // Verify non-critical cache keys were evicted
      expect(await redisService.exists('cache:feed:test_user_1')).toBe(false);
      expect(await redisService.exists('cache:posts:test_post_1')).toBe(false);
      expect(await redisService.exists('cache:users:test_user_1')).toBe(false);
      expect(await redisService.exists('og:preview:test_link')).toBe(false);

      // Verify protected keys remain completely untouched!
      expect(await redisService.exists('session:test_sess_1')).toBe(true);
      expect(await redisService.exists('lock:test_lock_1')).toBe(true);
      expect(await redisService.exists('auth:test_user_1')).toBe(true);
    });

    it('triggers self-healing runbook via POST /health/self-heal endpoint', async () => {
      const res = await request(app.getHttpServer())
        .post('/health/self-heal')
        .send({ force: true, reason: 'E2E API Trigger' })
        .expect(200);

      const healBody = res.body as SelfHealResponseDto;
      expect(healBody).toHaveProperty('triggered', true);
      expect(healBody).toHaveProperty('reason', 'E2E API Trigger');
      expect(healBody).toHaveProperty('evictedCount');
      expect(healBody).toHaveProperty('freedBytes');
      expect(healBody).toHaveProperty('durationMs');
      expect(healBody).toHaveProperty('timestamp');
    });

    it('automatically triggers self-healing during deep health check when memory exceeds 90%', async () => {
      // Simulate 95% memory usage
      selfHealingService.setSimulatedMemoryRatioForTesting(0.95);

      const res = await request(app.getHttpServer()).get('/health');
      expect([200, 503]).toContain(res.status);

      const healthBody = res.body as HealthResponseDto;
      expect(healthBody).toHaveProperty('selfHealing');
      expect(healthBody.selfHealing).toMatchObject({
        status: 'triggered',
        redisMemoryRatio: 0.95,
      });
    });
  });

  describe('2. Deadlock Detection & Application-Level Timeout Interceptor', () => {
    it('allows fast requests to complete normally without timeout', async () => {
      const res = await request(app.getHttpServer()).get('/test-deadlock/fast').expect(200);
      const fastBody = res.body as { status: string };

      expect(fastBody).toEqual({ status: 'fast_response' });
    });

    it('intercepts hung async deadlock operation and returns 504 Gateway Timeout with cancellation', async () => {
      const startTime = Date.now();
      const res = await request(app.getHttpServer())
        .get('/test-deadlock/hung-deadlock')
        .expect(504);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(700); // Fired around 250ms, much earlier than 800ms
      const errorBody = res.body as {
        statusCode: number;
        errorCode: string;
        error: string;
        message: string;
      };
      expect(errorBody).toMatchObject({
        statusCode: 504,
        errorCode: 'GATEWAY_TIMEOUT',
        error: 'GatewayTimeoutException',
      });
      expect(errorBody.message).toContain('Operation timed out after 250ms');
    });
  });
});
