import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const route = (req.route as { path?: string } | undefined)?.path || req.path;
    const method = req.method;

    // Intercept response
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const originalSend = res.send.bind(res);
    res.send = (data: unknown) => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Record metrics
      this.metricsService.recordHttpRequest(method, route, statusCode, duration);

      if (statusCode >= 400) {
        this.metricsService.recordHttpError(method, route, statusCode);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      res.send = originalSend;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return originalSend(data);
    };

    next();
  }
}
