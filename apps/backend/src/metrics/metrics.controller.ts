import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
