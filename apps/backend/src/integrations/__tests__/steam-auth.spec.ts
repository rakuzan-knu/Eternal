import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@common/prisma';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { TokenRevocationService } from '../../auth/token-revocation.service';
import { RedisService } from '../../redis/redis.service';
import { ShowcaseService } from '../../showcase/showcase.service';
import { IntegrationsController } from '../integrations.controller';
import { IntegrationsService } from '../integrations.service';
import { SpotifyService } from '../spotify.service';
import { SoundCloudService } from '../soundcloud.service';
import { SteamAuthService, STEAM_AUTH_COOKIE } from '../steam-auth.service';

describe('Steam OpenID account linking', () => {
  let app: NestFastifyApplication;
  let integrations: IntegrationsService;
  const records = new Map<string, string>();
  const secret = 'local-steam-auth-regression-secret-only';
  const jwt = new JwtService({ secret });
  const token = jwt.sign({ sub: 'user-1', jti: 'session-1', type: 'access' });
  const streamFetch = vi.fn<typeof fetch>();
  const upsert = vi.fn().mockResolvedValue({});
  const findUnique = vi
    .fn()
    .mockResolvedValue({ connectedAccounts: { github: { username: 'retained' } } });
  const rawRedis = {
    status: 'ready',
    set: vi.fn(async (key: string, value: string, _ex: string, _ttl: number, _nx: string) => {
      if (records.has(key)) return null;
      records.set(key, value);
      return 'OK';
    }),
    getdel: vi.fn(async (key: string) => {
      const value = records.get(key) ?? null;
      records.delete(key);
      return value;
    }),
  };

  beforeEach(async () => {
    records.clear();
    vi.clearAllMocks();
    rawRedis.status = 'ready';
    streamFetch
      .mockReset()
      .mockImplementation(
        async () => new Response('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n'),
      );
    vi.stubGlobal('fetch', streamFetch);
    vi.stubEnv('STEAM_CALLBACK_URL', 'https://music.example/v1/integrations/steam/callback');
    vi.stubEnv('CORS_ORIGIN', 'https://web.example');
    const module = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        IntegrationsService,
        SteamAuthService,
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => secret } },
        {
          provide: UsersService,
          useValue: {
            findById: async (id: string) => ({ id, email: 'unit@example.test', username: 'unit' }),
          },
        },
        { provide: TokenRevocationService, useValue: { isTokenRevoked: async () => false } },
        { provide: PrismaService, useValue: { profileShowcase: { findUnique, upsert } } },
        { provide: RedisService, useValue: { getClient: () => rawRedis, del: vi.fn() } },
        ...[ShowcaseService, SpotifyService, SoundCloudService].map((provide) => ({
          provide,
          useValue: {},
        })),
      ],
    }).compile();
    integrations = module.get(IntegrationsService);
    vi.spyOn(integrations, 'getPlatformData').mockResolvedValue({
      steamId: '76561198000000001',
      username: 'Verified Player',
    });
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
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

  async function transaction() {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/integrations/steam/auth',
      headers: { authorization: `Bearer ${token}`, host: 'untrusted-host.example' },
      payload: { origin: 'https://web.example' },
    });
    expect(start.statusCode).toBe(201);
    const started = start.json<{ url: string; launchProof: string }>();
    const launchUrl = new URL(started.url);
    expect(launchUrl.origin).toBe('https://music.example');
    expect(launchUrl.search).toBe('');
    const ticket = launchUrl.hash.slice(1);
    expect(ticket).toMatch(/^[a-f0-9]{64}$/);
    const launch = await app.inject({
      method: 'POST',
      url: '/v1/integrations/steam/launch',
      headers: { origin: 'https://music.example' },
      payload: { ticket, proof: started.launchProof, origin: 'https://web.example' },
    });
    expect(launch.statusCode).toBe(201);
    const cookies = launch.headers['set-cookie'];
    const cookieLine = Array.isArray(cookies)
      ? cookies.find((value) => value.startsWith(STEAM_AUTH_COOKIE + '='))
      : cookies;
    if (typeof cookieLine !== 'string') throw new Error('Missing browser proof cookie');
    expect(cookieLine).toContain('HttpOnly');
    expect(cookieLine).toContain('Secure');
    expect(cookieLine).toContain('SameSite=Lax');
    const browserCookie = cookieLine.split(';')[0] || '';
    const provider = new URL(launch.json<{ url: string }>().url);
    expect(provider.origin + provider.pathname).toBe('https://steamcommunity.com/openid/login');
    expect(provider.searchParams.get('openid.realm')).toBe('https://music.example/');
    const callback = new URL(provider.searchParams.get('openid.return_to') || '');
    const fields: Record<string, string> = {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'id_res',
      'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
      'openid.return_to': callback.href,
      'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000001',
      'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000001',
      'openid.assoc_handle': 'fixture-handle',
      'openid.sig': 'fixture-signature',
      'openid.response_nonce':
        new Date().toISOString().slice(0, 19) + 'Z' + launchUrl.hash.slice(1, 17),
      'openid.signed': 'op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
    };
    for (const [key, value] of Object.entries(fields)) callback.searchParams.set(key, value);
    return { ticket, proof: started.launchProof, callback, browserCookie };
  }

  function callbackRequest(callback: URL, browserCookie: string) {
    return app.inject({
      method: 'GET',
      url: callback.pathname + callback.search,
      headers: { cookie: browserCookie },
    });
  }

  it('rejects anonymous and legacy GET starts, and userId supplied instead of CurrentUser', async () => {
    const anonymous = await app.inject({
      method: 'POST',
      url: '/v1/integrations/steam/auth',
      payload: { origin: 'https://web.example' },
    });
    const legacy = await app.inject('/v1/integrations/steam/auth?userId=victim');
    const injected = await app.inject({
      method: 'POST',
      url: '/v1/integrations/steam/auth',
      headers: { authorization: `Bearer ${token}` },
      payload: { origin: 'https://web.example', userId: 'victim' },
    });
    expect(anonymous.statusCode).toBe(401);
    expect(legacy.statusCode).toBe(401);
    expect(injected.statusCode).toBe(400);
    expect(rawRedis.set).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('verifies the assertion against fixed HTTPS Steam before writing the bound user, and rejects replay', async () => {
    const { callback, browserCookie } = await transaction();
    const response = await callbackRequest(callback, browserCookie);
    expect(response.statusCode).toBe(200);
    expect(streamFetch).toHaveBeenCalledWith(
      'https://steamcommunity.com/openid/login',
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    );
    const verificationBody = streamFetch.mock.calls[0]?.[1]?.body;
    if (!(verificationBody instanceof URLSearchParams))
      throw new Error('Missing verification body');
    expect(verificationBody.get('openid.mode')).toBe('check_authentication');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        update: {
          connectedAccounts: {
            github: { username: 'retained' },
            steam: expect.objectContaining({ steamId: '76561198000000001', verified: true }),
          },
        },
      }),
    );
    expect(response.body).toContain('"https://web.example"');
    expect(response.body).not.toContain("}, '*')");
    const replay = await callbackRequest(callback, browserCookie);
    expect(replay.statusCode).toBe(401);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['https://attacker.example', 'https://web.example', 'correct'],
    [undefined, 'https://web.example', 'correct'],
    ['https://music.example', 'https://attacker.example', 'correct'],
    ['https://music.example', 'https://web.example', 'wrong'],
  ])(
    'rejects a transplanted launch without its authenticated opener proof (%s, %s, %s)',
    async (requestOrigin, openerOrigin, proofKind) => {
      const start = await app.inject({
        method: 'POST',
        url: '/v1/integrations/steam/auth',
        headers: { authorization: `Bearer ${token}` },
        payload: { origin: 'https://web.example' },
      });
      const started = start.json<{ url: string; launchProof: string }>();
      const ticket = new URL(started.url).hash.slice(1);
      const result = await app.inject({
        method: 'POST',
        url: '/v1/integrations/steam/launch',
        headers: requestOrigin ? { origin: requestOrigin } : {},
        payload: {
          ticket,
          proof: proofKind === 'correct' ? started.launchProof : 'f'.repeat(64),
          origin: openerOrigin,
        },
      });
      expect(result.statusCode).toBe(401);
      expect(result.headers['set-cookie']).toBeUndefined();
      expect(streamFetch).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['openid.claimed_id', 'https://attacker.example/openid/id/76561198000000001'],
    ['openid.identity', 'https://steamcommunity.com/openid/id/76561198000000002'],
    ['openid.op_endpoint', 'https://attacker.example/verify'],
    ['openid.return_to', 'https://attacker.example/callback'],
    ['openid.signed', 'return_to,identity'],
    ['openid.mode', 'cancel'],
    ['openid.ns', 'wrong'],
    ['openid.__proto__', 'tampered'],
    ['openid.unexpected', 'tampered'],
    ['openid.realm', 'https://attacker.example/'],
    ['openid.response_nonce', '2000-01-01T00:00:00Zexpired'],
    ['userId', 'victim'],
    ['state', 'f'.repeat(64)],
  ])('performs no provider request or DB write for tampered %s', async (key, value) => {
    const { callback, browserCookie } = await transaction();
    callback.searchParams.set(key, value);
    const response = await callbackRequest(callback, browserCookie);
    expect(response.statusCode).toBe(401);
    expect(streamFetch).not.toHaveBeenCalled();
    expect(integrations.getPlatformData).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects missing browser proof, invalid signature/provider response, and consumes the transaction', async () => {
    const first = await transaction();
    expect((await callbackRequest(first.callback, '')).statusCode).toBe(401);
    const second = await transaction();
    streamFetch.mockResolvedValueOnce(new Response('is_valid:false\n'));
    expect((await callbackRequest(second.callback, second.browserCookie)).statusCode).toBe(401);
    expect((await callbackRequest(second.callback, second.browserCookie)).statusCode).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('allows only one concurrent callback, and rejects replayed launch tickets', async () => {
    const { callback, browserCookie, ticket, proof } = await transaction();
    const results = await Promise.all([
      callbackRequest(callback, browserCookie),
      callbackRequest(callback, browserCookie),
    ]);
    expect(results.map((response) => response.statusCode).sort()).toEqual([200, 401]);
    expect(upsert).toHaveBeenCalledTimes(1);
    const repeatLaunch = await app.inject({
      method: 'POST',
      url: '/v1/integrations/steam/launch',
      headers: { origin: 'https://music.example' },
      payload: { ticket, proof, origin: 'https://web.example' },
    });
    expect(repeatLaunch.statusCode).toBe(401);
  });

  it('rejects repeated nonces across transactions and verification network failures', async () => {
    const first = await transaction();
    expect((await callbackRequest(first.callback, first.browserCookie)).statusCode).toBe(200);
    const second = await transaction();
    second.callback.searchParams.set(
      'openid.response_nonce',
      first.callback.searchParams.get('openid.response_nonce') || '',
    );
    expect((await callbackRequest(second.callback, second.browserCookie)).statusCode).toBe(401);
    const third = await transaction();
    streamFetch.mockRejectedValueOnce(new Error('Unavailable'));
    expect((await callbackRequest(third.callback, third.browserCookie)).statusCode).toBe(401);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('fails closed on unavailable Redis, untrusted origins and wrong callback path', async () => {
    const badOrigin = await app.inject({
      method: 'POST',
      url: '/v1/integrations/steam/auth',
      headers: { authorization: `Bearer ${token}` },
      payload: { origin: 'https://attacker.example' },
    });
    expect(badOrigin.statusCode).toBe(400);
    const { callback, browserCookie } = await transaction();
    callback.pathname = '/v1/api/integrations/steam/callback';
    expect((await callbackRequest(callback, browserCookie)).statusCode).toBe(401);
    rawRedis.status = 'connecting';
    const unavailable = await app.inject({
      method: 'POST',
      url: '/v1/integrations/steam/auth',
      headers: { authorization: `Bearer ${token}` },
      payload: { origin: 'https://web.example' },
    });
    expect(unavailable.statusCode).toBe(503);
    expect(upsert).not.toHaveBeenCalled();
  });
});
