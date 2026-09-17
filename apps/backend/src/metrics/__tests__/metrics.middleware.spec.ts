import type { Request, Response, NextFunction } from 'express';
import { MetricsMiddleware } from '../metrics.middleware';
import type { MetricsService } from '../metrics.service';

describe('MetricsMiddleware', () => {
  let middleware: MetricsMiddleware;
  let mockMetricsService: {
    recordHttpRequest: jest.Mock;
    recordHttpError: jest.Mock;
  };

  beforeEach(() => {
    mockMetricsService = {
      recordHttpRequest: jest.fn(),
      recordHttpError: jest.fn(),
    };

    middleware = new MetricsMiddleware(mockMetricsService as unknown as MetricsService);
  });

  it('records metrics when response send is executed', () => {
    const req = {
      method: 'GET',
      path: '/api/posts',
      route: { path: '/api/posts' },
    } as unknown as Request;

    const originalSend = jest.fn();
    const res = {
      statusCode: 200,
      send: originalSend,
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();

    // Call intercepted res.send
    res.send({ status: 'ok' });

    expect(mockMetricsService.recordHttpRequest).toHaveBeenCalledWith(
      'GET',
      '/api/posts',
      200,
      expect.any(Number),
    );
    expect(mockMetricsService.recordHttpError).not.toHaveBeenCalled();
    expect(originalSend).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('records http error when status >= 400', () => {
    const req = {
      method: 'POST',
      path: '/api/auth/login',
    } as unknown as Request;

    const originalSend = jest.fn();
    const res = {
      statusCode: 401,
      send: originalSend,
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);
    res.send({ error: 'Unauthorized' });

    expect(mockMetricsService.recordHttpError).toHaveBeenCalledWith('POST', '/api/auth/login', 401);
  });
});
