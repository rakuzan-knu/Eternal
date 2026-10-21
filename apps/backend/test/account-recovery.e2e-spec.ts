import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { TurnstileService } from '../src/auth/turnstile.service';
import { TokenRevocationService } from '../src/auth/token-revocation.service';
import { InMemoryBloomFilterService } from '../src/common/bloom/in-memory-bloom-filter.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { RedisService } from '../src/redis/redis.service';
import { SessionsService } from '../src/sessions/sessions.service';
import { UsersService } from '../src/users/users.service';

describe('Account recovery lookup (HTTP)', () => {
  let app: INestApplication<App>;
  const findByEmail = vi.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: UsersService, useValue: { findByEmail } },
        ...[
          ConfigService,
          JwtService,
          TurnstileService,
          TokenRevocationService,
          InMemoryBloomFilterService,
          RedisService,
          SessionsService,
        ].map((provide) => ({ provide, useValue: {} })),
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    await app.init();
  });

  beforeEach(() => {
    findByEmail.mockReset();
  });
  afterAll(async () => app?.close());

  it('finds an existing account anonymously and returns only the recovery preview', async () => {
    findByEmail.mockResolvedValue({
      id: 'account-id',
      email: 'person@example.com',
      username: 'person',
      displayName: 'Person',
      avatar: null,
      passwordHash: 'must-not-be-exposed',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/find-account')
      .send({ identifier: ' Person@Example.COM ' })
      .expect(200);

    expect(findByEmail).toHaveBeenCalledWith('person@example.com');
    expect(response.body).toEqual({
      id: 'account-id',
      name: 'Person',
      role: 'USER',
      src: null,
      maskedEmail: 'p***@example.com',
      maskedPhone: '',
    });
  });

  it('uses the username when the display name is absent', async () => {
    findByEmail.mockResolvedValue({
      id: 'account-id',
      email: 'p@example.com',
      username: 'person',
      displayName: null,
      avatar: null,
    });
    const response = await request(app.getHttpServer())
      .post('/auth/find-account')
      .send({ identifier: 'p@example.com' })
      .expect(200);
    expect(response.body).toMatchObject({ name: 'person', maskedEmail: 'p***@example.com' });
  });

  it('distinguishes an absent account from a missing route', async () => {
    findByEmail.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .post('/auth/find-account')
      .send({ identifier: 'missing@example.com' })
      .expect(404);
    expect(response.body).toMatchObject({ errorCode: 'ACCOUNT_NOT_FOUND' });
  });

  it.each([{}, { identifier: '   ' }, { identifier: 123 }, { identifier: 'a'.repeat(256) }])(
    'rejects invalid input before querying accounts: %j',
    async (payload) => {
      await request(app.getHttpServer()).post('/auth/find-account').send(payload).expect(400);
      expect(findByEmail).not.toHaveBeenCalled();
    },
  );

  it('does not report a database failure as an absent account', async () => {
    findByEmail.mockRejectedValue(new Error('Database unavailable'));
    const response = await request(app.getHttpServer())
      .post('/auth/find-account')
      .send({ identifier: 'person@example.com' })
      .expect(500);
    expect(response.body).toMatchObject({ errorCode: 'INTERNAL_SERVER_ERROR' });
  });
});
