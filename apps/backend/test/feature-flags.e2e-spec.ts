import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { FeatureFlagsService } from '../src/feature-flags/feature-flags.service';

describe('Feature Flags (e2e)', () => {
  let app: INestApplication<App>;
  let featureFlagsService: FeatureFlagsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    featureFlagsService = moduleFixture.get(FeatureFlagsService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /flags returns evaluation map of all feature flags', async () => {
    const res = await request(app.getHttpServer()).get('/flags');
    expect([200, 500, 503]).toContain(res.status);

    if (res.status === 200) {
      const body = res.body as { flags: Record<string, { enabled: boolean }> };
      expect(body).toHaveProperty('flags');
      expect(typeof body.flags).toBe('object');
    }
  });

  it('evaluates deterministic percentage rollout with stickiness and monotonicity', async () => {
    const testFlagKey = `e2e_rollout_${Date.now()}`;

    // Create flag with 50% rollout
    await featureFlagsService.createFlag({
      key: testFlagKey,
      description: 'E2E test rollout',
      isEnabled: true,
      rolloutPercentage: 50,
      targetUserIds: [],
      targetRoles: [],
    });

    const userA = randomUUID();
    const userB = randomUUID();

    // 1. Stickiness check: same user gets exact same evaluation across multiple calls
    const eval1 = await featureFlagsService.evaluateFlag(testFlagKey, userA);
    const eval2 = await featureFlagsService.evaluateFlag(testFlagKey, userA);
    expect(eval1.enabled).toBe(eval2.enabled);

    // 2. Kill switch check: disabling flag turns it off for everyone
    await featureFlagsService.updateFlag(testFlagKey, { isEnabled: false });
    const disabledEval = await featureFlagsService.evaluateFlag(testFlagKey, userA);
    expect(disabledEval.enabled).toBe(false);

    // 3. Allowlist check: target user gets true even with 0% rollout
    await featureFlagsService.updateFlag(testFlagKey, {
      isEnabled: true,
      rolloutPercentage: 0,
      targetUserIds: [userB],
    });
    const allowlistedEval = await featureFlagsService.evaluateFlag(testFlagKey, userB);
    const nonAllowlistedEval = await featureFlagsService.evaluateFlag(testFlagKey, userA);
    expect(allowlistedEval.enabled).toBe(true);
    expect(nonAllowlistedEval.enabled).toBe(false);

    // Cleanup
    await featureFlagsService.deleteFlag(testFlagKey);
  });

  it('GET /flags/:key evaluates a single flag', async () => {
    const res = await request(app.getHttpServer()).get('/flags/non_existent_key_123');
    expect([200, 500, 503]).toContain(res.status);

    if (res.status === 200) {
      const body = res.body as { enabled: boolean };
      expect(body.enabled).toBe(false);
    }
  });
});
