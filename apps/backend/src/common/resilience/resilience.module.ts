import { Global, Module } from '@nestjs/common';
import { ServerHealthMonitorService } from './server-health-monitor.service';
import { LoadSheddingGuard } from './load-shedding.guard';
import { QueryComplexityService } from './query-complexity.service';
import { QueryComplexityGuard } from './query-complexity.guard';
import { AlertingService } from './alerting.service';
import { AdaptiveThrottlerGuard } from './adaptive-throttler.guard';
import { DeadlockDetectionInterceptor } from './deadlock-detection.interceptor';

@Global()
@Module({
  providers: [
    ServerHealthMonitorService,
    LoadSheddingGuard,
    QueryComplexityService,
    QueryComplexityGuard,
    AlertingService,
    AdaptiveThrottlerGuard,
    DeadlockDetectionInterceptor,
  ],
  exports: [
    ServerHealthMonitorService,
    LoadSheddingGuard,
    QueryComplexityService,
    QueryComplexityGuard,
    AlertingService,
    AdaptiveThrottlerGuard,
    DeadlockDetectionInterceptor,
  ],
})
export class ResilienceModule {}
