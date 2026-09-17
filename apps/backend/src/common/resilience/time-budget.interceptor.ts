import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CpuCircuitBreaker } from '../v8/time-budget';

/**
 * TimeBudgetInterceptor: Monitors CPU execution duration of request handlers.
 * If a handler consumes excessive synchronous CPU time (>5ms), logs a warning
 * and registers metrics to protect the Event Loop responsiveness.
 */
@Injectable()
export class TimeBudgetInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeBudgetInterceptor.name);
  private readonly breaker = new CpuCircuitBreaker('http-handlers', {
    budgetMs: 15, // 15ms total handler execution budget
    tripThreshold: 5,
    cooldownMs: 5_000,
  });

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = performance.now();
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    return next.handle().pipe(
      tap(() => {
        const elapsed = performance.now() - start;
        if (elapsed > 5) {
          this.logger.debug(
            `[TimeBudget] ${className}.${handlerName} took ${elapsed.toFixed(2)}ms (budget: 5ms)`,
          );
        }
      }),
    );
  }

  getCircuitState() {
    return this.breaker.getState();
  }
}
