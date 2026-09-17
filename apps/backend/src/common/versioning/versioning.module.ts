import { Module } from '@nestjs/common';
import { MetricsModule } from '../../metrics/metrics.module';
import { DeprecationInterceptor } from './deprecation.interceptor';

@Module({
  imports: [MetricsModule],
  providers: [DeprecationInterceptor],
  exports: [DeprecationInterceptor],
})
export class VersioningModule {}
