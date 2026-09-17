import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { defer, type Observable } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { TraceContext, type TraceStore } from './trace-context';

@Injectable()
export class WsTraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'ws') {
      return next.handle();
    }

    const wsContext = context.switchToWs();
    const client = wsContext.getClient<{
      id?: string;
      userId?: string;
      traceId?: string;
      handshake?: { headers?: Record<string, unknown>; auth?: { traceId?: string } };
    }>();

    const clientTraceId = client?.traceId || client?.handshake?.auth?.traceId || randomUUID();

    const store: TraceStore = {
      traceId: clientTraceId,
      correlationId: clientTraceId,
      userId: client?.userId,
      reqMethod: 'WS_EVENT',
      reqUrl: context.getHandler()?.name || 'ws-event',
      startTime: Date.now(),
      startHrTime: process.hrtime.bigint(),
    };

    return defer(() => TraceContext.runIsolated(store, () => next.handle()));
  }
}
