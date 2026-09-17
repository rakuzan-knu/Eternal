import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ServerHealthMonitorService } from './server-health-monitor.service';
import { REQUEST_PRIORITY_KEY, RequestPriority } from './request-priority.decorator';
import type { Request, Response } from 'express';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class LoadSheddingGuard implements CanActivate {
  private readonly logger = new Logger(LoadSheddingGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly healthMonitor: ServerHealthMonitorService,
    @Optional() private readonly metricsService?: MetricsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const priority =
      this.reflector.getAllAndOverride<RequestPriority>(REQUEST_PRIORITY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? RequestPriority.NORMAL;

    // Critical and high priority requests are never shed by default
    if (priority === RequestPriority.CRITICAL) {
      return true;
    }

    // In local development, avoid accidental shedding unless explicitly simulating
    const isDev =
      !process.env.NODE_ENV ||
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test';
    if (isDev && !this.healthMonitor.isSimulationActive()) {
      return true;
    }

    const status = this.healthMonitor.getHealthStatus();

    // 1. Critical server load (Event Loop > 250ms or CPU > 95%): shed NORMAL and LOW
    if (status.isCritical) {
      if (priority === RequestPriority.LOW || priority === RequestPriority.NORMAL) {
        this.shedRequest(
          context,
          priority,
          10,
          'CRITICAL',
          status.eventLoopDelayMs,
          status.cpuUsagePercent,
        );
      }
    }
    // 2. Degraded server load (Event Loop > 100ms or CPU > 85% or Heap > 90%): shed LOW
    else if (status.isDegraded) {
      if (priority === RequestPriority.LOW) {
        this.shedRequest(
          context,
          priority,
          5,
          'DEGRADED',
          status.eventLoopDelayMs,
          status.cpuUsagePercent,
        );
      }
    }

    return true;
  }

  private shedRequest(
    context: ExecutionContext,
    priority: RequestPriority,
    retryAfterSeconds: number,
    reason: 'DEGRADED' | 'CRITICAL',
    eventLoopDelayMs: number,
    cpuPercent: number,
  ): never {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const routeObj = req.route as { path?: unknown } | undefined;
    const routePath = typeof routeObj?.path === 'string' ? routeObj.path : undefined;
    const route: string = routePath || (typeof req.url === 'string' ? req.url : 'unknown');
    const method: string = typeof req.method === 'string' ? req.method : 'GET';

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', String(retryAfterSeconds));
    }

    this.logger.warn(
      `[LOAD_SHEDDING] Dropping ${priority} priority request [${method} ${route}] due to server ${reason} state (EventLoop: ${eventLoopDelayMs.toFixed(1)}ms, CPU: ${cpuPercent.toFixed(1)}%)`,
    );

    if (this.metricsService?.recordLoadShedRequest) {
      this.metricsService.recordLoadShedRequest(priority, route, method);
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        errorCode: reason === 'CRITICAL' ? 'SERVICE_CRITICAL' : 'SERVICE_DEGRADED',
        error: 'ServiceUnavailable',
        message:
          reason === 'CRITICAL'
            ? 'Server is under critical load. Non-essential request shed to protect core real-time services.'
            : 'Server is experiencing elevated load. Low-priority request shed to maintain chat responsiveness.',
        retryAfter: retryAfterSeconds,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
