import { MetricsController } from '../metrics.controller';
import type { MetricsService } from '../metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let mockMetricsService: {
    getMetrics: jest.Mock;
  };

  beforeEach(() => {
    mockMetricsService = {
      getMetrics: jest.fn().mockResolvedValue('# HELP http_requests_total\n'),
    };

    controller = new MetricsController(mockMetricsService as unknown as MetricsService);
  });

  it('getMetrics delegates to MetricsService', async () => {
    const result = await controller.getMetrics();

    expect(mockMetricsService.getMetrics).toHaveBeenCalled();
    expect(result).toBe('# HELP http_requests_total\n');
  });
});
