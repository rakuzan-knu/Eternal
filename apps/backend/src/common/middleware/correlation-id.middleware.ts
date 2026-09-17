import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { TraceContext } from '../tracing/trace-context';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      traceId?: string;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const headerVal =
      req.headers['x-trace-id'] ||
      req.headers['x-correlation-id'] ||
      req.headers['x-request-id'] ||
      req.headers['traceparent'];

    const rawId = Array.isArray(headerVal) ? headerVal[0] : headerVal;
    const traceId = (rawId && typeof rawId === 'string' ? rawId : undefined) || randomUUID();

    req.traceId = traceId;
    req.correlationId = traceId;
    if (typeof res.setHeader === 'function') {
      res.setHeader('x-trace-id', traceId);
      res.setHeader('x-correlation-id', traceId);
    } else if (typeof (res as { header?: (k: string, v: string) => void }).header === 'function') {
      (res as { header: (k: string, v: string) => void }).header('x-trace-id', traceId);
      (res as { header: (k: string, v: string) => void }).header('x-correlation-id', traceId);
    }

    const cleanupTrace = () => {
      TraceContext.clear();
      if (typeof res.removeListener === 'function') {
        res.removeListener('finish', cleanupTrace);
        res.removeListener('close', cleanupTrace);
      }
    };

    if (typeof res.once === 'function') {
      res.once('finish', cleanupTrace);
      res.once('close', cleanupTrace);
    }

    TraceContext.run(
      {
        traceId,
        correlationId: traceId,
        reqMethod: req.method,
        reqUrl: req.originalUrl || req.url,
        startTime: Date.now(),
        startHrTime: process.hrtime.bigint(),
      },
      () => next(),
    );
  }
}
