import { createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { TokenRevocationService } from '../../auth/token-revocation.service';
import { roleControllers } from '../../config/service-role';
import { ServiceRoleGuard } from '../../config/service-role.guard';
import { YouTubeDesktopController } from '../youtube-desktop.controller';
import { YouTubeDesktopService } from '../youtube-desktop.service';
import { IntegrationsService } from '../integrations.service';

describe('YouTube desktop system-browser handoff', () => {
  let app: NestFastifyApplication;
  const secret = 'youtube-desktop-regression-secret';
  const verifier = 'a'.repeat(64);
  const challenge = createHash('sha256').update(verifier).digest('hex');
  const base = '/v1/integrations/youtube/desktop';
  const records = new Map<string, string>();
  const upsert = vi.fn<(args: Prisma.ProfileShowcaseUpsertArgs) => Promise<unknown>>(
    async () => ({}),
  );
  const rawRedis = {
    status: 'ready',
    set: vi.fn(async (key: string, value: string) => {
      records.set(key, value);
      return 'OK';
    }),
    get: vi.fn(async (key: string) => records.get(key) ?? null),
    getdel: vi.fn(async (key: string) => {
      const raw = records.get(key) ?? null;
      records.delete(key);
      return raw;
    }),
    eval: vi.fn(async (_script: string, _count: number, key: string, raw: string) => {
      if (records.get(key) !== raw) return 0;
      records.delete(key);
      return 1;
    }),
  };
  const headers = (userId = 'owner') => ({
    authorization: `Bearer ${new JwtService({ secret }).sign({ sub: userId, jti: 'session', type: 'access' })}`,
    origin: 'https://eternalnet.vercel.app',
  });

  beforeEach(async () => {
    records.clear();
    vi.clearAllMocks();
    rawRedis.status = 'ready';
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SERVICE_ROLE', 'music');
    vi.stubEnv('CORS_ORIGIN', 'https://eternalnet.vercel.app');
    vi.stubEnv('RENDER_EXTERNAL_URL', 'https://music.example');
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-secret');
    vi.stubEnv('YOUTUBE_API_KEY', '');
    const module = await Test.createTestingModule({
      controllers: roleControllers('music', [YouTubeDesktopController]),
      providers: [
        YouTubeDesktopService,
        IntegrationsService,
        JwtStrategy,
        { provide: RedisService, useValue: { getClient: () => rawRedis, del: vi.fn() } },
        {
          provide: PrismaService,
          useValue: {
            profileShowcase: {
              findUnique: async () => ({ connectedAccounts: { github: { username: 'octocat' } } }),
              upsert,
            },
          },
        },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'JWT_ACCESS_SECRET' ? secret : undefined) },
        },
        {
          provide: UsersService,
          useValue: {
            findById: async (id: string) => ({ id, username: id, email: `${id}@example.test` }),
          },
        },
        { provide: TokenRevocationService, useValue: { isTokenRevoked: async () => false } },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ ignoreTrailingSlash: true }),
    );
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalGuards(new ServiceRoleGuard(new Reflector()));
    await app.register(cookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  async function start() {
    const response = await app.inject({
      method: 'POST',
      url: `${base}/start/`,
      headers: headers(),
      payload: { challenge },
    });
    expect(response.statusCode).toBe(201);
    const result = response.json<{ url: string; transaction: string }>();
    const url = new URL(result.url);
    expect(url.origin).toBe('https://music.example');
    expect(url.pathname).toBe(`${base}/launch`);
    expect(url.search).toBe('');
    const body = Object.fromEntries(new URLSearchParams(url.hash.slice(1)));
    return { ...result, body };
  }

  async function launched() {
    const result = await start();
    const response = await app.inject({
      method: 'POST',
      url: `${base}/launch`,
      headers: { origin: 'https://music.example' },
      payload: result.body,
    });
    expect(response.statusCode).toBe(201);
    const google = new URL(response.json<{ url: string }>().url);
    expect(google.origin).toBe('https://accounts.google.com');
    expect(google.searchParams.get('redirect_uri')).toBe(`https://music.example${base}/callback`);
    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toEqual(expect.stringContaining('youtube_desktop_oauth_state='));
    expect(setCookie).toEqual(expect.stringContaining('HttpOnly'));
    expect(setCookie).toEqual(expect.stringContaining('Secure'));
    const browserCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(';')[0];
    if (!browserCookie) throw new Error('Missing browser cookie');
    return {
      ...result,
      google,
      browserCookie: `${browserCookie}; youtube_oauth_state=legacy-web-cookie`,
    };
  }

  async function completed(error?: string) {
    const result = await launched();
    const query = new URLSearchParams({
      state: `youtube:${result.transaction}`,
      ...(error ? { error } : { code: 'google-authorization-code' }),
      scope: 'youtube.readonly',
    });
    const response = await app.inject({
      method: 'GET',
      url: `${base}/callback?${query}`,
      headers: { cookie: result.browserCookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['set-cookie']).toEqual(
      expect.stringContaining('youtube_desktop_oauth_state=;'),
    );
    expect(response.body).not.toContain('google-authorization-code');
    const match = response.body.match(/href="([^"]+)"/);
    if (!match) throw new Error('Missing handoff link');
    const link = new URL(match[1].replaceAll('&amp;', '&'));
    return {
      ...result,
      code: link.searchParams.get('code')!,
      transaction: link.searchParams.get('transaction')!,
    };
  }

  it('keeps start/redeem authenticated and validates input separately', async () => {
    for (const action of ['start', 'redeem']) {
      expect(
        (await app.inject({ method: 'POST', url: `${base}/${action}`, payload: {} })).statusCode,
      ).toBe(401);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/${action}`,
            headers: headers(),
            payload: { challenge: 'invalid', userId: 'attacker' },
          })
        ).statusCode,
      ).toBe(400);
    }
    vi.stubEnv('SERVICE_ROLE', 'core');
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/start`,
          headers: headers(),
          payload: { challenge },
        })
      ).statusCode,
    ).toBe(404);
  });

  it('requires the owning browser cookie, rejects replay, and waits for authenticated redemption before writing', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (url) => {
      const target = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (target === 'https://oauth2.googleapis.com/token')
        return Response.json({ access_token: 'private-google-token' });
      return Response.json({
        items: [
          {
            id: 'channel',
            snippet: { title: 'My channel', customUrl: '@owner' },
            statistics: { subscriberCount: '12' },
          },
        ],
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await completed();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    const payload = { code: result.code, transaction: result.transaction, verifier };
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/redeem`,
          headers: headers(),
          payload: { ...payload, transaction: 'c'.repeat(64) },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/redeem`,
          headers: headers('attacker'),
          payload,
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/redeem`,
          headers: headers(),
          payload: { ...payload, verifier: 'b'.repeat(64) },
        })
      ).statusCode,
    ).toBe(401);
    const responses = await Promise.all(
      [1, 2].map(() =>
        app.inject({ method: 'POST', url: `${base}/redeem`, headers: headers(), payload }),
      ),
    );
    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 401]);
    const success = responses.find((response) => response.statusCode === 201)!;
    expect(success.json()).toMatchObject({
      success: true,
      data: { verified: true, channelTitle: 'My channel' },
    });
    expect(success.body).not.toContain('private-google-token');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      body: new URLSearchParams({
        code: 'google-authorization-code',
        client_id: 'google-client',
        client_secret: 'google-secret',
        redirect_uri: `https://music.example${base}/callback`,
        grant_type: 'authorization_code',
      }),
    });
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert.mock.calls[0][0]).toMatchObject({
      where: { userId: 'owner' },
      update: {
        connectedAccounts: { github: { username: 'octocat' }, youtube: { verified: true } },
      },
    });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `${base}/callback?state=youtube:${result.transaction}&code=again`,
          headers: { cookie: result.browserCookie },
        })
      ).statusCode,
    ).toBe(401);
  });

  it('rejects missing/mismatched cookies without consuming the valid callback', async () => {
    const result = await launched();
    const url = `${base}/callback?state=youtube:${result.transaction}&code=google-code`;
    for (const cookieValue of ['', 'youtube_desktop_oauth_state=wrong']) {
      expect(
        (await app.inject({ method: 'GET', url, headers: { cookie: cookieValue } })).statusCode,
      ).toBe(401);
    }
    expect(
      (await app.inject({ method: 'GET', url, headers: { cookie: result.browserCookie } }))
        .statusCode,
    ).toBe(200);
  });

  it('checks launch origin, proof, and replay', async () => {
    const result = await start();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/launch`,
          headers: { origin: 'https://evil.example' },
          payload: result.body,
        })
      ).statusCode,
    ).toBe(401);
    const launched = await app.inject({
      method: 'POST',
      url: `${base}/launch`,
      headers: { origin: 'https://music.example' },
      payload: result.body,
    });
    expect(launched.statusCode).toBe(201);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/launch`,
          headers: { origin: 'https://music.example' },
          payload: result.body,
        })
      ).statusCode,
    ).toBe(401);
    const wrongProof = await start();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/launch`,
          headers: { origin: 'https://music.example' },
          payload: { ...wrongProof.body, proof: 'f'.repeat(64) },
        })
      ).statusCode,
    ).toBe(401);
  });

  it('returns denial through a bound handoff without exchanging or writing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await completed('access_denied');
    const response = await app.inject({
      method: 'POST',
      url: `${base}/redeem`,
      headers: headers(),
      payload: { code: result.code, transaction: result.transaction, verifier },
    });
    expect(response.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('fails closed for expired handoffs and unavailable Redis', async () => {
    const result = await completed();
    for (const key of records.keys()) if (key.startsWith('youtube-handoff:')) records.delete(key);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/redeem`,
          headers: headers(),
          payload: { code: result.code, transaction: result.transaction, verifier },
        })
      ).statusCode,
    ).toBe(401);
    rawRedis.status = 'reconnecting';
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `${base}/start`,
          headers: headers(),
          payload: { challenge },
        })
      ).statusCode,
    ).toBe(503);
  });

  it('does not retry desktop Google exchange against legacy redirect URIs when Google rejects the code', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ error: 'invalid_grant' }, { status: 400 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await completed();
    const response = await app.inject({
      method: 'POST',
      url: `${base}/redeem`,
      headers: headers(),
      payload: { code: result.code, transaction: result.transaction, verifier },
    });
    expect(response.statusCode).toBe(400);
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = fetchMock.mock.calls[0][1]?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    if (!(body instanceof URLSearchParams)) throw new Error('Missing token form');
    expect(body.get('redirect_uri')).toBe(`https://music.example${base}/callback`);
    expect(upsert).not.toHaveBeenCalled();
  });
});
