import {
  healthServicesStatusSchema,
  healthResponseSchema,
  pingResponseSchema,
  HealthServicesStatusDto,
  HealthResponseDto,
  PingResponseDto,
} from '../health';

describe('health contract schemas (health.spec.ts)', () => {
  it('should validate healthServicesStatusSchema', () => {
    const valid = healthServicesStatusSchema.parse({
      database: 'ok',
      redis: 'ok',
    });
    expect(valid.database).toBe('ok');
    expect(valid.redis).toBe('ok');
  });

  it('should validate healthResponseSchema', () => {
    const valid = healthResponseSchema.parse({
      status: 'ok',
      timestamp: '2026-08-20T12:00:00.000Z',
      uptime: 123.45,
      services: {
        database: 'ok',
        redis: 'ok',
      },
    });
    expect(valid.status).toBe('ok');
    expect(valid.uptime).toBe(123.45);
  });

  it('should validate pingResponseSchema', () => {
    const valid = pingResponseSchema.parse({
      status: 'ok',
      timestamp: '2026-08-20T12:00:00.000Z',
    });
    expect(valid.status).toBe('ok');
  });

  it('should instantiate DTO classes without errors', () => {
    const sDto = new HealthServicesStatusDto();
    sDto.database = 'ok';
    sDto.redis = 'error';

    const hDto = new HealthResponseDto();
    hDto.status = 'degraded';
    hDto.timestamp = '2026-08-20T12:00:00.000Z';
    hDto.uptime = 50;
    hDto.services = sDto;

    const pDto = new PingResponseDto();
    pDto.status = 'ok';
    pDto.timestamp = '2026-08-20T12:00:00.000Z';

    expect(hDto.status).toBe('degraded');
    expect(pDto.status).toBe('ok');
  });
});
