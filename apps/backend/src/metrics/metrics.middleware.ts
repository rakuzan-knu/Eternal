import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = process.hrtime.bigint();
    const route =
      (req.route as { path?: string } | undefined)?.path ||
      req.path ||
      (req as unknown as { raw?: { url?: string } }).raw?.url ||
      req.url;
    const method = req.method;

    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true;
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      const statusCode = res.statusCode || 200;

      this.metricsService.recordHttpRequest(method, route, statusCode, duration);
      if (statusCode >= 400) {
        this.metricsService.recordHttpError(method, route, statusCode);
      }
    };

    const rawRes = (res as unknown as { raw?: Response }).raw;
    const targetEmitter = typeof res.once === 'function' ? res : rawRes;

    const cleanup = () => {
      if (targetEmitter && typeof targetEmitter.removeListener === 'function') {
        targetEmitter.removeListener('finish', onComplete);
        targetEmitter.removeListener('close', onComplete);
      }
    };

    const onComplete = () => {
      cleanup();
      record();
    };

    if (targetEmitter && typeof targetEmitter.once === 'function') {
      targetEmitter.once('finish', onComplete);
      targetEmitter.once('close', onComplete);
    }

    if (typeof res.send === 'function') {
      const originalSend = res.send.bind(res);
      res.send = (data: unknown) => {
        record();
        res.send = originalSend;
        return originalSend(data);
      };
    }

    next();
  }
}
