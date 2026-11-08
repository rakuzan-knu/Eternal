import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import request from 'supertest';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Redis from 'ioredis';
import {
  REGISTRATION_TERMS_VERSION,
  authResponseSchema,
  registrationPolicySchema,
} from '../src/common/contracts';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { RegistrationPolicyService } from '../src/auth/registration-policy.service';
import { RegistrationOpenGuard } from '../src/auth/guards/registration-open.guard';
import { TurnstileService } from '../src/auth/turnstile.service';
import { TokenRevocationService } from '../src/auth/token-revocation.service';
import { UsersService } from '../src/users/users.service';
import { UsersRepository } from '../src/users/repositories/users.repository';
import { USERS_REPOSITORY } from '../src/users/interfaces/users-repository.interface';
import { VisibilityResolver } from '../src/users/privacy/visibility.resolver';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { SessionsService } from '../src/sessions/sessions.service';
import { SessionsRepository } from '../src/sessions/repositories/sessions.repository';
import { SESSIONS_REPOSITORY } from '../src/sessions/interfaces/sessions-repository.interface';
import { InMemoryBloomFilterService } from '../src/common/bloom/in-memory-bloom-filter.service';
import { assertIsolatedAuthFixtureEnvironment } from './existing-auth-user';

describe('Self-service Ukraine registration with PostgreSQL, Redis and automatic sessions', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redis: Redis;
  const emails: string[] = [];
  const config = new ConfigService({
    UA_PUBLIC_REGISTRATION_ENABLED: 'false',
    JWT_ACCESS_SECRET: 'isolated-ua-registration-access-secret',
    JWT_REFRESH_SECRET: 'isolated-ua-registration-refresh-secret',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '1h',
  });
  const captcha = vi.fn().mockResolvedValue(true);

  beforeAll(async () => {
    assertIsolatedAuthFixtureEnvironment();
    redis = new Redis(process.env.REDIS_URL!);
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [AuthController],
      providers: [
        AuthService,
        RegistrationPolicyService,
        RegistrationOpenGuard,
        UsersService,
        PrismaService,
        SessionsService,
        InMemoryBloomFilterService,
        { provide: ConfigService, useValue: config },
        { provide: USERS_REPOSITORY, useClass: UsersRepository },
        { provide: SESSIONS_REPOSITORY, useClass: SessionsRepository },
        { provide: VisibilityResolver, useValue: {} },
        { provide: TurnstileService, useValue: { verifyToken: captcha } },
        { provide: TokenRevocationService, useValue: { isTokenRevoked: () => false } },
        {
          provide: RedisService,
          useValue: {
            set: (key: string, value: string, ttl: number) => redis.set(key, value, 'EX', ttl),
            exists: (key: string) => redis.exists(key),
            withLock: async <T>(_key: string, action: () => Promise<T>) => action(),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(cookie);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) await prisma.user.deleteMany({ where: { email: { in: emails } } });
    if (app) await app.close();
    redis?.disconnect();
  });

  function signup(age = 18) {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const email = `ua.${suffix}@example.com`;
    emails.push(email);
    return {
      email,
      username: `ua${suffix}`,
      password: 'FixturePassword123!',
      birthDate: new Date(Date.UTC(new Date().getUTCFullYear() - age, 0, 1)).toISOString(),
      admission: {
        countryOfResidence: 'UA',
        termsVersion: REGISTRATION_TERMS_VERSION,
        acceptedTerms: true,
        privacyNoticeAcknowledged: true,
        contractingRole: age === 13 ? 'PARENT_FOR_CHILD' : 'SELF',
        guardianApproval: age < 18,
      },
    };
  }

  it('matches the shared policy contract and the exact terms source', async () => {
    const source = await readFile(
      resolve(process.cwd(), '../../packages/shared/content/src/legal/terms.ts'),
      'utf8',
    );
    expect(createHash('sha256').update(source.replace(/\r\n/g, '\n')).digest('hex')).toBe(
      REGISTRATION_TERMS_VERSION,
    );
    const shared = await readFile(
      resolve(process.cwd(), '../../packages/shared/contracts/src/registration-policy.ts'),
      'utf8',
    );
    const server = await readFile(
      resolve(process.cwd(), 'src/common/contracts/registration-policy.ts'),
      'utf8',
    );
    expect(shared).toBe(server);
  });

  it('keeps the switch closed by default and reopens only the Ukrainian policy', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(signup()).expect(403);
    expect(captcha).not.toHaveBeenCalled();
    config.set('UA_PUBLIC_REGISTRATION_ENABLED', 'true');
    const response = await request(app.getHttpServer())
      .get('/auth/registration-policy')
      .expect(200);
    expect(registrationPolicySchema.parse(response.body)).toMatchObject({
      registrationOpen: true,
      reviewedMarkets: ['UA'],
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('rejects missing, wrong-country, stale-terms and inappropriate guardian declarations before writes', async () => {
    const count = await prisma.user.count();
    const base = signup();
    for (const admission of [
      undefined,
      { ...base.admission, countryOfResidence: 'DE' },
      { ...base.admission, acceptedTerms: false },
      { ...base.admission, termsVersion: 'old' },
    ]) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...base, admission })
        .expect(400);
    }
    for (const age of [13, 14, 17]) {
      const child = signup(age);
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...child, admission: { ...child.admission, guardianApproval: false } })
        .expect(400);
    }
    const child = signup(13);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...child, admission: { ...child.admission, contractingRole: 'SELF' } })
      .expect(400);
    await request(app.getHttpServer()).post('/auth/register').send(signup(12)).expect(400);
    expect(await prisma.user.count()).toBe(count);
  });

  it.each([13, 14, 17, 18])(
    'creates an age %i account and issues working tokens without operator approval',
    async (age) => {
      const input = signup(age);
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(input)
        .expect(201);
      const authentication = authResponseSchema.parse(response.body);
      const setCookie = response.headers['set-cookie'];
      if (!Array.isArray(setCookie) || typeof setCookie[0] !== 'string')
        throw new Error('Missing session cookie');
      expect(setCookie[0]).toContain('HttpOnly');
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', setCookie[0].split(';')[0])
        .send({})
        .expect(200);
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: authentication.user.id },
        include: { registrationAdmission: true, privacy: true, sessions: true },
      });
      expect(user.registrationAdmission).toMatchObject({
        countryOfResidence: 'UA',
        termsVersion: REGISTRATION_TERMS_VERSION,
        guardianApprovalDeclared: age < 18,
      });
      expect(user.sessions.length).toBeGreaterThan(0);
      expect(user.isPrivate).toBe(age < 18);
      if (age < 18)
        expect(user.privacy).toMatchObject({
          birthday: 'NOBODY',
          allowNearbyRecommendations: false,
          calls: 'CONTACTS',
          messages: 'CONTACTS',
          groupInvites: 'CONTACTS',
        });
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: input.email, password: input.password })
        .expect(200);
      await prisma.user.delete({ where: { id: user.id } });
      expect(
        await prisma.registrationAdmission.findUnique({ where: { userId: user.id } }),
      ).toBeNull();
    },
  );

  it('keeps account and admission creation atomic under duplicate concurrent requests', async () => {
    const input = signup();
    const responses = await Promise.all(
      [0, 1].map(() => request(app.getHttpServer()).post('/auth/register').send(input)),
    );
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    const users = await prisma.user.findMany({
      where: { email: input.email },
      include: { registrationAdmission: true },
    });
    expect(users).toHaveLength(1);
    expect(users[0].registrationAdmission).not.toBeNull();
  });

  it('offers sign-in recovery if the account committed before the session store failed', async () => {
    const input = signup();
    const set = vi
      .spyOn(redis, 'set')
      .mockRejectedValueOnce(new Error('Isolated session store failure'));
    try {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(input)
        .expect(503);
      expect(response.text).toContain('ACCOUNT_CREATED_SIGN_IN');
      expect(response.headers['set-cookie']).toBeUndefined();
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: input.email },
        include: { registrationAdmission: true },
      });
      expect(user.registrationAdmission).not.toBeNull();
    } finally {
      set.mockRestore();
    }
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: input.email, password: input.password })
      .expect(200);
  });
});
