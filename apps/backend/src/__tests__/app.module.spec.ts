process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/social_network_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-jwt-access-secret-at-least-32-chars-long-for-testing';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-at-least-32-chars-long-for-testing';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';

import type { MiddlewareConsumer } from '@nestjs/common';
import { AppModule } from '../app.module';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';
import { MetricsMiddleware } from '../metrics/metrics.middleware';

describe('AppModule', () => {
  let appModule: AppModule;

  beforeEach(() => {
    appModule = new AppModule();
  });

  it('is defined', () => {
    expect(appModule).toBeDefined();
  });

  it('configures middlewares correctly on MiddlewareConsumer', () => {
    const mockForRoutes = jest.fn();
    const mockApply = jest.fn().mockReturnValue({ forRoutes: mockForRoutes });
    const mockConsumer: MiddlewareConsumer = {
      apply: mockApply,
    };

    appModule.configure(mockConsumer);

    expect(mockApply).toHaveBeenCalledWith(CorrelationIdMiddleware, MetricsMiddleware);
    expect(mockForRoutes).toHaveBeenCalledWith('*');
  });
});
