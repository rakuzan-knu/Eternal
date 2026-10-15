import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../../redis/redis.service';
import { ShowcaseService } from '../../showcase/showcase.service';
import { GithubController } from '../../github/github.controller';
import { GithubService } from '../../github/github.service';
import { GITHUB_REPOSITORY } from '../../github/interfaces/github-repository.interface';
import { IntegrationsController } from '../integrations.controller';
import { IntegrationsService } from '../integrations.service';
import { SpotifyService } from '../spotify.service';
import { SpotifyCallbackController } from '../spotify-callback.controller';
import { SoundCloudService } from '../soundcloud.service';

afterEach(() => vi.unstubAllEnvs());

describe('OAuth service transport and ownership', () => {
  it.each([
    ['/integrations/spotify/auth', 'https://accounts.spotify.com/authorize'],
    ['/auth/spotify', 'https://accounts.spotify.com/authorize'],
  ])('uses HTTP 302 for the explicit %s controller route with Fastify', async (path, target) => {
    vi.stubEnv('SPOTIFY_CLIENT_ID', 'test-client-id');
    vi.stubEnv('SPOTIFY_CALLBACK_URL', 'https://web.example/api/auth/spotify/callback');
    const module = await Test.createTestingModule({
      controllers: [IntegrationsController, SpotifyCallbackController],
      providers: [
        IntegrationsService,
        SpotifyService,
        ...[PrismaService, RedisService, ShowcaseService, SoundCloudService].map((provide) => ({
          provide,
          useValue: {},
        })),
      ],
    }).compile();
    const app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `${path}?userId=user-123`,
        headers: { host: 'music.example' },
      });
      expect(response.statusCode).toBe(302);
      const location = response.headers.location;
      if (!location) throw new Error('Missing provider redirect');
      expect(location).toContain(target);
      const destination = new URL(location);
      if (path.includes('spotify')) {
        expect(destination.searchParams.get('redirect_uri')).toBe(
          'https://web.example/api/auth/spotify/callback',
        );
        expect(destination.searchParams.get('state')).toMatch(/^[a-f0-9]+:user-123$/);
      } else {
        expect(destination.searchParams.get('openid.return_to')).toContain(
          'http://music.example/integrations/steam/callback?userId=user-123',
        );
      }
    } finally {
      await app.close();
    }
  });
  it.each([
    ['https://core.example/v1/', 'https://core.example/v1/auth/github'],
    ['', 'http://music.example/auth/github'],
  ])('keeps GitHub on core with monolith fallback using Fastify (%s)', async (origin, expected) => {
    vi.stubEnv('CORE_API_URL', origin);
    const module = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        IntegrationsService,
        ...[PrismaService, RedisService, ShowcaseService, SpotifyService, SoundCloudService].map(
          (provide) => ({ provide, useValue: {} }),
        ),
      ],
    }).compile();
    const app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/integrations/github/auth?userId=user-123&origin=https%3A%2F%2Fweb.example',
        headers: { host: 'music.example' },
      });
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(
        expected + '?userId=user-123&origin=https%3A%2F%2Fweb.example',
      );
    } finally {
      await app.close();
    }
  });
  it('sets secure ten-minute GitHub state cookies using the Fastify cookie plugin', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const module = await Test.createTestingModule({
      controllers: [GithubController],
      providers: [
        GithubService,
        { provide: GITHUB_REPOSITORY, useValue: {} },
        { provide: RedisService, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'GITHUB_CLIENT_ID'
                ? 'test-client-id'
                : 'https://core.example/v1/auth/github/callback',
          },
        },
      ],
    }).compile();
    const app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(cookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/github?origin=https%3A%2F%2Fweb.example',
      });
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('https://github.com/login/oauth/authorize?');
      const cookies = response.headers['set-cookie'];
      expect(Array.isArray(cookies)).toBe(true);
      if (!Array.isArray(cookies)) throw new Error('Missing OAuth cookies');
      expect(cookies).toHaveLength(2);
      for (const value of cookies) {
        expect(value).toContain('Path=/');
        expect(value).toContain('Max-Age=600');
        expect(value).toContain('HttpOnly');
        expect(value).toContain('Secure');
        expect(value).toContain('SameSite=Lax');
      }
      const rejected = await app.inject({
        method: 'GET',
        url: '/integrations/github/callback?code=unused&state=wrong',
        headers: {
          cookie: 'github_oauth_state=expected; github_client_origin=https%3A%2F%2Fweb.example',
        },
      });
      expect(rejected.statusCode).toBe(302);
      expect(rejected.headers.location).toBe(
        'https://web.example/settings?error=csrf_state_mismatch',
      );
      const cleared = rejected.headers['set-cookie'];
      if (!Array.isArray(cleared)) throw new Error('Missing cleared OAuth cookies');
      expect(cleared).toHaveLength(2);
      for (const value of cleared) {
        expect(value).toContain('Path=/');
        expect(value).toContain('Max-Age=0');
      }
    } finally {
      await app.close();
    }
  });
});
