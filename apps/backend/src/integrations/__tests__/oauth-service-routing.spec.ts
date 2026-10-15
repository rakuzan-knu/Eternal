import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { TokenRevocationService } from '../../auth/token-revocation.service';
import { ShowcaseService } from '../../showcase/showcase.service';
import { GithubController } from '../../github/github.controller';
import { GithubService } from '../../github/github.service';
import { GITHUB_REPOSITORY } from '../../github/interfaces/github-repository.interface';
import { IntegrationsController } from '../integrations.controller';
import { IntegrationsService } from '../integrations.service';
import { SpotifyService } from '../spotify.service';
import { SpotifyCallbackController } from '../spotify-callback.controller';
import { SoundCloudService } from '../soundcloud.service';

describe('OAuth service transport and ownership', () => {
  let app: NestFastifyApplication;
  let githubCallback = 'https://core.example/v1/integrations/github/callback';
  const secret = 'local-oauth-routing-regression-secret';
  const token = new JwtService({ secret }).sign({
    sub: 'user-123',
    jti: 'test-session',
    type: 'access',
  });
  const headers = {
    authorization: `Bearer ${token}`,
    host: 'core.example',
    origin: 'https://web.example',
  };
  const records = new Map<string, string>();
  const rawRedis = {
    status: 'ready',
    getdel: vi.fn(async (key: string) => {
      const raw = records.get(key) ?? null;
      records.delete(key);
      return raw;
    }),
    set: vi.fn(async (key: string, value: string) => {
      records.set(key, value);
      return 'OK';
    }),
    get: vi.fn(async (key: string) => records.get(key) ?? null),
    eval: vi.fn(async (_script: string, _count: number, key: string, value: string) => {
      if (records.get(key) !== value) return 0;
      records.delete(key);
      return 1;
    }),
  };

  beforeEach(async () => {
    records.clear();
    githubCallback = 'https://core.example/v1/integrations/github/callback';
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CORS_ORIGIN', 'https://web.example');
    vi.stubEnv('RENDER_EXTERNAL_URL', 'https://music.example');
    vi.stubEnv('SPOTIFY_CLIENT_ID', 'test-client-id');
    vi.stubEnv('SPOTIFY_CALLBACK_URL', 'https://music.example/v1/auth/spotify/callback');
    const module = await Test.createTestingModule({
      controllers: [IntegrationsController, SpotifyCallbackController, GithubController],
      providers: [
        IntegrationsService,
        SpotifyService,
        GithubService,
        JwtStrategy,
        { provide: GITHUB_REPOSITORY, useValue: {} },
        { provide: RedisService, useValue: { getClient: () => rawRedis } },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                JWT_ACCESS_SECRET: secret,
                GITHUB_CLIENT_ID: 'github-client',
                GITHUB_CALLBACK_URL: githubCallback,
                CORS_ORIGIN: 'https://web.example',
              })[key],
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: async (id: string) => ({ id, email: 'unit@example.test', username: 'unit' }),
          },
        },
        { provide: TokenRevocationService, useValue: { isTokenRevoked: async () => false } },
        ...[PrismaService, ShowcaseService, SoundCloudService].map((provide) => ({
          provide,
          useValue: {},
        })),
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(cookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(['/integrations/spotify/auth', '/auth/spotify'])(
    'rejects anonymous userId spoofing at %s and binds authenticated redirects to the session',
    async (path) => {
      const rejected = await app.inject({ method: 'GET', url: `${path}?userId=attacker` });
      expect(rejected.statusCode).toBe(401);
      const response = await app.inject({ method: 'GET', url: `${path}?userId=attacker`, headers });
      expect(response.statusCode).toBe(302);
      const destination = new URL(response.headers.location!);
      expect(destination.origin).toBe('https://accounts.spotify.com');
      const state = destination.searchParams.get('state');
      expect(state).toMatch(/^spotify:[a-f0-9]{64}$/);
      expect(JSON.parse(records.get(`oauth-state:${state}`)!)).toMatchObject({
        userId: 'user-123',
      });
      expect(response.headers['set-cookie']).toEqual(expect.stringContaining('HttpOnly'));
    },
  );

  it.each([
    '/v1/auth/github/callback',
    '/v1/integrations/github/callback',
    '/api/auth/github/callback',
  ])(
    'starts GitHub on canonical core launch with configured callback %s and rejects mismatched browser state',
    async (callbackPath) => {
      githubCallback = `https://core.example${callbackPath}`;
      expect(
        (await app.inject({ method: 'POST', url: '/auth/github/oauth/start' })).statusCode,
      ).toBe(401);
      const response = await app.inject({
        method: 'POST',
        url: '/auth/github/oauth/start',
        headers,
      });
      expect(response.statusCode).toBe(201);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['set-cookie']).toBeUndefined();
      const result = response.json<{ url: string; launchProof: string }>();
      const launchUrl = new URL(result.url);
      expect(launchUrl.origin).toBe('https://core.example');
      expect(launchUrl.pathname).toBe('/v1/auth/github/oauth/launch');
      expect(launchUrl.search).toBe('');
      expect(result.url).not.toContain(result.launchProof);
      expect(result.launchProof).toMatch(/^[a-f0-9]{64}$/);
      const launched = await app.inject({
        method: 'POST',
        url: '/auth/github/oauth/launch',
        headers: { origin: launchUrl.origin },
        payload: {
          ticket: launchUrl.hash.slice(1),
          proof: result.launchProof,
          origin: 'https://web.example',
        },
      });
      expect(launched.statusCode).toBe(201);
      const destination = new URL(launched.json<{ url: string }>().url);
      expect(destination.origin).toBe('https://github.com');
      expect(destination.searchParams.get('redirect_uri')).toBe(githubCallback);
      const state = destination.searchParams.get('state');
      expect(state).toMatch(/^github:[a-f0-9]{64}$/);
      expect(JSON.parse(records.get(`oauth-state:${state}`)!)).toMatchObject({
        userId: 'user-123',
      });
      const browserCookie = launched.headers['set-cookie'];
      expect(typeof browserCookie).toBe('string');
      expect(browserCookie).toEqual(expect.stringContaining('Max-Age=600'));
      expect(browserCookie).toEqual(expect.stringContaining('HttpOnly; Secure; SameSite=Lax'));
      const provider = vi.spyOn(globalThis, 'fetch');
      const rejected = await app.inject({
        method: 'GET',
        url: `/auth/github/callback?code=unused&state=${state}`,
        headers: { cookie: 'github_oauth_state=wrong' },
      });
      expect(rejected.statusCode).toBe(401);
      expect(provider).not.toHaveBeenCalled();
      expect(records.has(`oauth-state:${state}`)).toBe(true);
      const replay = await app.inject({
        method: 'POST',
        url: '/auth/github/oauth/launch',
        headers: { origin: launchUrl.origin },
        payload: {
          ticket: launchUrl.hash.slice(1),
          proof: result.launchProof,
          origin: 'https://web.example',
        },
      });
      expect(replay.statusCode).toBe(401);
    },
  );

  it('sets Spotify state cookies in the first-party Music launch instead of the cross-site authenticated request', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/integrations/spotify/oauth/start',
      headers,
    });
    expect(started.statusCode).toBe(201);
    expect(started.headers['set-cookie']).toBeUndefined();
    const result = started.json<{ url: string; launchProof: string }>();
    const launch = new URL(result.url);
    expect(launch.origin).toBe('https://music.example');
    const payload = {
      ticket: launch.hash.slice(1),
      proof: result.launchProof,
      origin: 'https://web.example',
    };
    const wrongHost = await app.inject({
      method: 'POST',
      url: '/integrations/oauth/launch',
      headers: { origin: 'https://untrusted.example' },
      payload,
    });
    expect(wrongHost.statusCode).toBe(401);
    const response = await app.inject({
      method: 'POST',
      url: '/integrations/oauth/launch',
      headers: { origin: launch.origin },
      payload,
    });
    expect(response.statusCode).toBe(201);
    expect(response.headers['set-cookie']).toEqual(expect.stringContaining('spotify_oauth_state='));
    const provider = new URL(response.json<{ url: string }>().url);
    expect(provider.origin).toBe('https://accounts.spotify.com');
    expect(provider.searchParams.get('redirect_uri')).toBe(
      'https://music.example/v1/auth/spotify/callback',
    );
  });

  it('rejects a stolen launch ticket without its opener proof and consumes the attempt', async () => {
    const started = await app.inject({ method: 'POST', url: '/auth/github/oauth/start', headers });
    const result = started.json<{ url: string; launchProof: string }>();
    const ticket = new URL(result.url).hash.slice(1);
    const bad = await app.inject({
      method: 'POST',
      url: '/auth/github/oauth/launch',
      headers: { origin: 'https://core.example' },
      payload: { ticket, proof: '0'.repeat(64), origin: 'https://web.example' },
    });
    expect(bad.statusCode).toBe(401);
    expect(bad.headers['set-cookie']).toBeUndefined();
    const retry = await app.inject({
      method: 'POST',
      url: '/auth/github/oauth/launch',
      headers: { origin: 'https://core.example' },
      payload: { ticket, proof: result.launchProof, origin: 'https://web.example' },
    });
    expect(retry.statusCode).toBe(401);
  });

  it('rejects generic GitHub and Steam start instead of issuing state on the wrong host or bypassing Steam proof', async () => {
    for (const platform of ['github', 'steam']) {
      const response = await app.inject({
        method: 'POST',
        url: `/integrations/${platform}/oauth/start`,
        headers,
      });
      expect(response.statusCode).toBe(400);
    }
    expect(records.size).toBe(0);
  });
});
