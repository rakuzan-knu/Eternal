import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import request from 'supertest';
import { z } from 'zod';
import { AppModule } from '../src/app.module';
import { authResponseSchema, registrationPolicySchema } from '../src/common/contracts/auth';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  assertIsolatedAuthFixtureEnvironment,
  seedExistingAuthUser,
  type ExistingAuthUser,
} from './existing-auth-user';

describe('Auth fixture isolation', () => {
  const isolated = {
    DATABASE_URL: 'postgresql://user:password@127.0.0.1:5432/social_test',
    DIRECT_URL: 'postgresql://user:password@127.0.0.1:5432/social_test',
    REDIS_URL: 'redis://127.0.0.1:6379',
  };

  it('accepts the explicitly isolated CI database and Redis', () => {
    expect(() => assertIsolatedAuthFixtureEnvironment(isolated)).not.toThrow();
  });

  it.each([
    { DATABASE_URL: undefined },
    { DATABASE_URL: 'postgresql://user:password@production.example/social_test' },
    { DATABASE_URL: 'postgresql://user:password@127.0.0.1:5432/social' },
    { DATABASE_URL: `${isolated.DATABASE_URL}?host=production.example` },
    { DIRECT_URL: 'postgresql://user:password@production.example/social_test' },
    { DIRECT_URL: 'postgresql://user:password@127.0.0.1:5433/social_test' },
    { REDIS_URL: 'redis://production.example:6379' },
    { REDIS_URL: undefined },
  ])('refuses non-disposable fixture connections before bootstrap', (override) => {
    expect(() => assertIsolatedAuthFixtureEnvironment({ ...isolated, ...override })).toThrow();
  });
});

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;
  let existingUser: ExistingAuthUser;
  let prisma: PrismaService;
  const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  beforeAll(async () => {
    assertIsolatedAuthFixtureEnvironment();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(fastifyCookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    existingUser = await seedExistingAuthUser(app, 'auth', runId);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /auth/registration-policy exposes the closed reviewed-market policy without authentication', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/registration-policy')
      .expect(200);
    expect(registrationPolicySchema.parse(response.body)).toEqual({
      minimumAge: 13,
      registrationOpen: false,
      reviewedMarkets: [],
      policyVersion: '2026-11-05',
      reason: 'REGIONAL_REVIEW_PENDING',
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each([
    { email: 'invalid-email' },
    {
      email: `closed.${runId}@example.com`,
      username: `closed${runId}`,
      password: 'Password123!',
      birthDate: '2000-01-01T00:00:00.000Z',
    },
  ])(
    'POST /auth/register remains closed before validating or creating an account',
    async (payload) => {
      const countBefore = await prisma.user.count();
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(payload)
        .expect(403);
      expect(
        z.object({ errorCode: z.literal('REGISTRATION_UNAVAILABLE') }).parse(response.body)
          .errorCode,
      ).toBe('REGISTRATION_UNAVAILABLE');
      expect(await prisma.user.count()).toBe(countBefore);
      expect(response.headers['set-cookie']).toBeUndefined();
    },
  );

  it('POST /auth/login rejects a wrong password for an existing account', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: existingUser.email, password: 'WrongPassword123!' })
      .expect(401);
  });

  it('an existing UUID account can sign in and refresh through its HttpOnly cookie while signup stays closed', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: existingUser.email, password: existingUser.password })
      .expect(200);
    const body = authResponseSchema.parse(response.body);
    expect(body.user.id).toBe(existingUser.id);
    expect(body.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(body.accessToken).toEqual(expect.any(String));
    const cookies = z.array(z.string()).parse(response.headers['set-cookie']);
    const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));
    expect(refreshCookie).toMatch(/^refreshToken=.+;.*HttpOnly/i);
    expect(refreshCookie).toContain('Path=/');
    expect(refreshCookie).toContain('SameSite=Lax');
    if (!refreshCookie) throw new Error('Expected refresh cookie was not set');

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie.split(';')[0])
      .send({})
      .expect(200);
    const refreshedBody = z.object({ accessToken: z.string().min(1) }).parse(refreshed.body);
    const account = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${refreshedBody.accessToken}`)
      .expect(200);
    expect(z.object({ id: z.string() }).parse(account.body).id).toBe(existingUser.id);
    await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(401);
  });
});
