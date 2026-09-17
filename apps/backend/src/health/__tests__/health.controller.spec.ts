import type { Response } from 'express';
import { HttpStatus } from '@nestjs/common';
import type { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from '../health.controller';
import type { HealthService } from '../health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthService: {
    getLiveness: jest.Mock;
    getReadiness: jest.Mock;
  };
  let mockResponse: {
    status: jest.Mock;
  };

  const sampleHealthResponse = {
    status: 'ok',
    timestamp: '2026-08-16T12:00:00.000Z',
    uptime: 120,
    services: { database: 'ok', redis: 'ok' },
  };

  beforeEach(() => {
    mockHealthService = {
      getLiveness: jest
        .fn()
        .mockReturnValue({ status: 'ok', timestamp: '2026-08-16T12:00:00.000Z' }),
      getReadiness: jest.fn(),
    };

    const mockHealthCheckService = {
      check: jest
        .fn()
        .mockImplementation((indicators: Array<() => unknown>) =>
          Promise.all(indicators.map((i) => i())),
        ),
    };

    mockResponse = {
      status: jest.fn(),
    };

    controller = new HealthController(
      mockHealthService as unknown as HealthService,
      mockHealthCheckService as unknown as HealthCheckService,
    );
  });

  it('check and getReadiness return healthy response with status 200', async () => {
    mockHealthService.getReadiness.mockResolvedValueOnce({
      isHealthy: true,
      response: sampleHealthResponse,
    });

    const result = await controller.check(mockResponse as unknown as Response);

    expect(result).toEqual(sampleHealthResponse);
    expect(mockResponse.status).not.toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('check sets 503 SERVICE_UNAVAILABLE status when degraded', async () => {
    mockHealthService.getReadiness.mockResolvedValueOnce({
      isHealthy: false,
      response: { ...sampleHealthResponse, status: 'degraded' },
    });

    const result = await controller.check(mockResponse as unknown as Response);

    expect(result.status).toBe('degraded');
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('getReadiness returns response and sets 503 when unhealthy', async () => {
    mockHealthService.getReadiness.mockResolvedValueOnce({
      isHealthy: true,
      response: sampleHealthResponse,
    });
    const healthy = await controller.getReadiness(mockResponse as unknown as Response);
    expect(healthy.status).toBe('ok');

    mockHealthService.getReadiness.mockResolvedValueOnce({
      isHealthy: false,
      response: { ...sampleHealthResponse, status: 'degraded' },
    });
    const degraded = await controller.getReadiness(mockResponse as unknown as Response);
    expect(degraded.status).toBe('degraded');
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('getLiveness and ping return liveness probe', () => {
    expect(controller.getLiveness()).toEqual(expect.objectContaining({ status: 'ok' }));
    expect(controller.ping()).toEqual(expect.objectContaining({ status: 'ok' }));
  });

  it('debugSentry throws error intentionally for Sentry testing', () => {
    expect(() => controller.debugSentry()).toThrow(/Sentry/);
  });
});
