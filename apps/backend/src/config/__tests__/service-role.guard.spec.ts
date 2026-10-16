import {
  Controller,
  Get,
  Injectable,
  UnauthorizedException,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ServiceRoleGuard } from '../service-role.guard';
import { roleControllers } from '../service-role';

@Injectable()
class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    if (request.headers.authorization === 'test-session') return true;
    throw new UnauthorizedException();
  }
}
@Controller('decorations')
class DefaultCoreController {
  @Get() read() {
    return { ok: true };
  }
}
@Controller('messenger/channels')
@UseGuards(AuthGuard)
class MessengerController {
  @Get() read() {
    return { ok: true };
  }
}
@Controller('health')
class HealthController {
  @Get() read() {
    return { ok: true };
  }
}

describe('HTTP deployment boundaries', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    vi.stubEnv('SERVICE_ROLE', 'all');
    const module = await Test.createTestingModule({
      controllers: [
        DefaultCoreController,
        ...roleControllers('messenger', [MessengerController]),
        ...roleControllers('all', [HealthController]),
      ],
      providers: [AuthGuard, { provide: APP_GUARD, useClass: ServiceRoleGuard }],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    await app.close();
  });

  it.each(['core', 'messenger', 'reels', 'music'])(
    'defaults future modules to core and keeps health on %s',
    async (role) => {
      vi.stubEnv('SERVICE_ROLE', role);
      const decorations = await app.inject({ method: 'GET', url: '/decorations' });
      expect(decorations.statusCode).toBe(role === 'core' ? 200 : 404);
      const health = await app.inject({ method: 'GET', url: '/health' });
      expect(health.statusCode).toBe(200);
    },
  );
  it('preserves authentication independently of service ownership', async () => {
    vi.stubEnv('SERVICE_ROLE', 'messenger');
    expect((await app.inject({ method: 'GET', url: '/messenger/channels' })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/messenger/channels',
          headers: { authorization: 'test-session' },
        })
      ).statusCode,
    ).toBe(200);
    vi.stubEnv('SERVICE_ROLE', 'core');
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/messenger/channels',
          headers: { authorization: 'test-session' },
        })
      ).statusCode,
    ).toBe(404);
  });
});
