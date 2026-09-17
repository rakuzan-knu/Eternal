import {
  healthServicesStatusSchema,
  healthResponseSchema,
  pingResponseSchema,
  HealthServicesStatusDto,
  HealthResponseDto,
  PingResponseDto,
} from '../health';

describe('health.contract', () => {
  it('validates healthServicesStatusSchema', () => {
    const valid = healthServicesStatusSchema.parse({ database: 'ok', redis: 'error' });
    expect(valid).toEqual({ database: 'ok', redis: 'error' });

    expect(() => healthServicesStatusSchema.parse({ database: 'down', redis: 'ok' })).toThrow();
  });

  it('validates healthResponseSchema', () => {
    const valid = healthResponseSchema.parse({
      status: 'degraded',
      timestamp: '2026-08-20T12:00:00.000Z',
      uptime: 3600.5,
      services: { database: 'ok', redis: 'error' },
    });
    expect(valid.status).toBe('degraded');
    expect(valid.uptime).toBe(3600.5);

    expect(() =>
      healthResponseSchema.parse({
        status: 'unknown-status',
        timestamp: 'now',
        uptime: 10,
        services: { database: 'ok', redis: 'ok' },
      }),
    ).toThrow();
  });

  it('validates pingResponseSchema', () => {
    const ping = pingResponseSchema.parse({
      status: 'pong',
      timestamp: '2026-08-20T12:00:00.000Z',
    });
    expect(ping.status).toBe('pong');
  });

  it('instantiates DTO classes properly', () => {
    const services = new HealthServicesStatusDto();
    services.database = 'ok';
    services.redis = 'ok';
    expect(services.database).toBe('ok');

    const health = new HealthResponseDto();
    health.status = 'ok';
    health.timestamp = '2026-08-20T12:00:00.000Z';
    health.uptime = 120;
    health.services = services;
    expect(health.status).toBe('ok');

    const ping = new PingResponseDto();
    ping.status = 'pong';
    ping.timestamp = '2026-08-20T12:00:00.000Z';
    expect(ping.status).toBe('pong');
  });
});
