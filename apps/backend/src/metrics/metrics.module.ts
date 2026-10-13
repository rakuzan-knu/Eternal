import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { roleControllers } from '../config/service-role';

@Global()
@Module({
  providers: [MetricsService],
  controllers: roleControllers('all', [MetricsController]),
  exports: [MetricsService],
})
export class MetricsModule {}
