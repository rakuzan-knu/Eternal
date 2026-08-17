import { MetricsService } from '../metrics.service';
import * as promClient from 'prom-client';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    promClient.register.clear();
    service = new MetricsService();
  });

  afterEach(() => {
    promClient.register.clear();
  });

  it('getMetrics returns prometheus metrics text', async () => {
    service.recordHttpRequest('GET', '/api/posts', 200, 150);
    service.recordHttpError('POST', '/api/auth/login', 401);
    service.incrementActiveConnections();
    service.decrementActiveConnections();
    service.recordDatabaseQuery('findUnique', 'User', 25);
    service.recordRedisOperation('GET', 5);

    const metrics = await service.getMetrics();

    expect(typeof metrics).toBe('string');
    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('http_requests_errors_total');
    expect(metrics).toContain('database_query_duration_seconds');
  });
});
