import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { TokenRevocationService } from '../auth/token-revocation.service';
import { ServiceRoleGuard } from '../config/service-role.guard';
import { roleControllers } from '../config/service-role';
import { UsersService } from '../users/users.service';
import { CoreDataExportController, MessengerDataExportController } from './data-export.controller';
import { DataExportCursor } from './data-export.cursor';
import { DataExportRepository } from './data-export.repository';
import { DataExportService } from './data-export.service';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import { RedisService } from '../redis/redis.service';

describe('authenticated data export HTTP contract', () => {
  let app: NestFastifyApplication;
  const jwt = new JwtService({ secret: 'test-export-http-secret' });
  const auth = {
    verifyPassword: vi.fn(async (_id: string, password: string) => password === 'correct'),
  };
  const repository = {
    account: vi.fn().mockResolvedValue({ id: 'owner-id', email: 'owner@example.test' }),
    posts: vi.fn().mockResolvedValue([]),
    messages: vi.fn().mockResolvedValue([]),
  };
  const redis = {
    get: vi
      .fn()
      .mockResolvedValue(JSON.stringify({ state: 'COMPLETED', body: { secret: 'cached-export' } })),
    set: vi.fn(),
    del: vi.fn(),
    getClient: vi.fn(),
  };
  const token = jwt.sign({
    type: 'access',
    sub: 'owner-id',
    email: 'owner@example.test',
    username: 'owner',
    jti: 'session-id',
  });
  const headers = { authorization: `Bearer ${token}` };

  beforeAll(async () => {
    vi.stubEnv('SERVICE_ROLE', 'all');
    const module = await Test.createTestingModule({
      controllers: [
        ...roleControllers('core', [CoreDataExportController]),
        ...roleControllers('messenger', [MessengerDataExportController]),
      ],
      providers: [
        AuthGuard,
        JwtStrategy,
        DataExportService,
        DataExportCursor,
        { provide: APP_GUARD, useClass: ServiceRoleGuard },
        { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
        { provide: RedisService, useValue: redis },
        { provide: AuthService, useValue: auth },
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_ACCESS_SECRET: 'test-export-http-secret' }),
        },
        { provide: DataExportRepository, useValue: repository },
        {
          provide: UsersService,
          useValue: {
            findById: vi.fn().mockResolvedValue({
              id: 'owner-id',
              email: 'owner@example.test',
              username: 'owner',
            }),
          },
        },
        {
          provide: TokenRevocationService,
          useValue: { isTokenRevoked: vi.fn().mockResolvedValue(false) },
        },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SERVICE_ROLE', 'all');
  });
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => app.close());

  it('requires an actual access JWT independently of password and payload validation', async () => {
    const request = {
      method: 'POST' as const,
      url: '/users/me/data-export',
      payload: { password: 'correct', section: 'account' },
    };
    expect((await app.inject(request)).statusCode).toBe(401);
    expect(
      (await app.inject({ ...request, headers: { authorization: 'Bearer invalid' } })).statusCode,
    ).toBe(401);
    const wrongType = jwt.sign({ type: 'refresh', sub: 'owner-id', jti: 'session-id' });
    expect(
      (await app.inject({ ...request, headers: { authorization: `Bearer ${wrongType}` } }))
        .statusCode,
    ).toBe(401);
    expect(auth.verifyPassword).not.toHaveBeenCalled();
    expect(repository.account).not.toHaveBeenCalled();
  });

  it('rejects incorrect passwords without returning or reading an export', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/me/data-export',
      headers,
      payload: { password: 'incorrect', section: 'account' },
    });
    expect(response.statusCode).toBe(401);
    expect(repository.account).not.toHaveBeenCalled();
    expect(response.body).not.toContain('owner@example.test');
    expect(response.body).not.toContain('incorrect');
  });

  it.each([
    { password: 'correct', section: 'account', userId: 'victim-id' },
    { password: 'correct', section: 'messages' },
    { password: 'correct', section: 'posts', limit: 101 },
    { password: 'correct', section: 'posts', limit: 0 },
    { password: '', section: 'account' },
    { password: 'correct', section: 'posts', cursor: 'a'.repeat(2049) },
  ])('rejects invalid payload or owner injection %#', async (payload) => {
    expect(
      (await app.inject({ method: 'POST', url: '/users/me/data-export', headers, payload }))
        .statusCode,
    ).toBe(400);
    expect(auth.verifyPassword).not.toHaveBeenCalled();
    expect(repository.account).not.toHaveBeenCalled();
    expect(repository.posts).not.toHaveBeenCalled();
  });

  it('takes the owner solely from the JWT and marks successful data non-cacheable', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/me/data-export',
      headers,
      payload: { password: 'correct', section: 'account' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toMatchObject({
      schemaVersion: 1,
      service: 'core',
      section: 'account',
      items: [{ id: 'owner-id' }],
      nextCursor: null,
    });
    expect(repository.account).toHaveBeenCalledWith('owner-id');
    expect(response.body).not.toContain('correct');
  });

  it.each(['/users/me/data-export', '/messenger/me/data-export'])(
    'does not cache or replay %s even when a client supplies an idempotency key',
    async (url) => {
      const request = {
        method: 'POST' as const,
        url,
        headers: { ...headers, 'x-idempotency-key': 'same-key-with-existing-private-cache' },
      };
      const section = url.startsWith('/users') ? 'account' : 'messages';
      const first = await app.inject({ ...request, payload: { password: 'correct', section } });
      const second = await app.inject({
        ...request,
        payload: { password: 'wrong-secret', section },
      });
      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(401);
      expect(first.body).not.toContain('cached-export');
      expect(second.body).not.toContain('cached-export');
      expect(auth.verifyPassword).toHaveBeenCalledTimes(2);
      expect(redis.get).not.toHaveBeenCalled();
      expect(redis.getClient).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
      expect(redis.del).not.toHaveBeenCalled();
    },
  );

  it.each(['core', 'messenger', 'reels', 'music'] as const)(
    'keeps export namespaces on their owning %s deployment',
    async (role) => {
      vi.stubEnv('SERVICE_ROLE', role);
      const core = await app.inject({
        method: 'POST',
        url: '/users/me/data-export',
        headers,
        payload: { password: 'correct', section: 'posts' },
      });
      const messenger = await app.inject({
        method: 'POST',
        url: '/messenger/me/data-export',
        headers,
        payload: { password: 'correct', section: 'messages' },
      });
      expect(core.statusCode).toBe(role === 'core' ? 200 : 404);
      expect(messenger.statusCode).toBe(role === 'messenger' ? 200 : 404);
      if (role === 'messenger') expect(messenger.headers['cache-control']).toBe('no-store');
    },
  );
});
