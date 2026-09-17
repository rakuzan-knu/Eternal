import {
  CallHandler,
  ExecutionContext,
  GatewayTimeoutException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, timeout } from 'rxjs';
import { TraceContext } from '../tracing/trace-context';
import { DEADLOCK_TIMEOUT_KEY } from './deadlock-timeout.decorator';
import { MetricsService } from '../../metrics/metrics.service';
import { ServerHealthMonitorService } from './server-health-monitor.service';

@Injectable()
export class DeadlockDetectionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DeadlockDetectionInterceptor.name);
  private readonly defaultTimeoutMs: number;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @Optional() private readonly metricsService?: MetricsService,
    @Optional() private readonly healthMonitor?: ServerHealthMonitorService,
  ) {
    const rawTimeout = this.configService.get<string>('APP_REQUEST_TIMEOUT_MS', '15000');
    this.defaultTimeoutMs = parseInt(rawTimeout, 10) || 15_000;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const handler = context.getHandler();
    const classRef = context.getClass();

    const customTimeout =
      this.reflector.get<number>(DEADLOCK_TIMEOUT_KEY, handler) ??
      this.reflector.get<number>(DEADLOCK_TIMEOUT_KEY, classRef);

    const timeoutMs = customTimeout !== undefined ? customTimeout : this.defaultTimeoutMs;

    // Disabled timeout if explicitly set to <= 0
    if (timeoutMs <= 0) {
      return next.handle();
    }

    // 1. Initialize per-request AbortController
    const controller = new AbortController();

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<{
      method?: string;
      url?: string;
      originalUrl?: string;
      traceId?: string;
      abortController?: AbortController;
      abortSignal?: AbortSignal;
      raw?: { abortController?: AbortController; abortSignal?: AbortSignal };
    }>();

    if (req) {
      req.abortController = controller;
      req.abortSignal = controller.signal;
      if (req.raw) {
        req.raw.abortController = controller;
        req.raw.abortSignal = controller.signal;
      }
    }

    // 2. Attach AbortController and Signal to TraceContext AsyncLocalStorage store
    TraceContext.setAbortController(controller);

    // 3. Wrap pipeline with RxJS timeout and trigger abort cancellation on deadlock
    return next.handle().pipe(
      timeout({
        each: timeoutMs,
        with: () =>
          throwError(() => {
            // Cancel downstream external HTTP fetches / DB calls listening to abort signal
            try {
              controller.abort(
                new Error(`Application-level deadlock / timeout exceeded limit of ${timeoutMs}ms`),
              );
            } catch {
              // ignore abort errors
            }

            const traceId = TraceContext.getTraceId() || req?.traceId || 'unknown';
            const method = req?.method || 'UNKNOWN';
            const url = req?.originalUrl || req?.url || 'UNKNOWN';
            const handlerName = `${classRef.name}.${handler.name}`;

            const healthStatus = this.healthMonitor?.getHealthStatus();
            const diagnostics = {
              traceId,
              method,
              url,
              handler: handlerName,
              timeoutMs,
              eventLoopLagMs: healthStatus?.eventLoopDelayMs,
              cpuUsagePercent: healthStatus?.cpuUsagePercent,
              heapRatio: healthStatus?.heapUsageRatio,
            };

            this.logger.error(
              `[DEADLOCK_TIMEOUT_DETECTED] Request ${method} ${url} (Handler: ${handlerName}) hung longer than ${timeoutMs}ms. AbortController fired. Diagnostics: ${JSON.stringify(diagnostics)}`,
            );

            if (this.metricsService) {
              const routePath = url.split('?')[0];
              this.metricsService.recordDeadlockSuspect(method, routePath, handlerName);
            }

            return new GatewayTimeoutException({
              statusCode: HttpStatus.GATEWAY_TIMEOUT,
              errorCode: 'GATEWAY_TIMEOUT',
              error: 'GatewayTimeout',
              message: `Operation timed out after ${timeoutMs}ms. External dependency or pipeline did not respond in time.`,
              traceId,
            });
          }),
      }),
    );
  }
}
