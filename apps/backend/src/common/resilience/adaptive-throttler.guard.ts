import { Injectable, Optional } from '@nestjs/common';
import {
  ThrottlerGuard,
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  type ThrottlerRequest,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { ServerHealthMonitorService } from './server-health-monitor.service';

@Injectable()
export class AdaptiveThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    @Optional() private readonly healthMonitor?: ServerHealthMonitorService,
  ) {
    super(options, storageService, reflector);
  }

  protected override async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    let effectiveLimit = requestProps.limit;

    if (this.healthMonitor) {
      const status = this.healthMonitor.getHealthStatus();
      if (status.isCritical) {
        effectiveLimit = Math.max(1, Math.floor(requestProps.limit * 0.3));
      } else if (status.isDegraded) {
        effectiveLimit = Math.max(2, Math.floor(requestProps.limit * 0.6));
      }
    }

    return super.handleRequest({
      ...requestProps,
      limit: effectiveLimit,
    });
  }
}
