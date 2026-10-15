import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /auth/register fails with invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'invalid-email' })
      .expect(400);
  });

  it('POST /auth/login fails with wrong credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'Password123!' })
      .expect(401);
  });

  it('POST /auth/register creates a UUID account and sets the refresh cookie', async () => {
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `merge-auth-${suffix}@example.com`,
        username: `mergeauth${suffix}`,
        password: 'Password123!',
      })
      .expect(201);
    const body = res.body as { user: { id: string }; accessToken: string };
    expect(body.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(body.accessToken).toEqual(expect.any(String));
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toEqual(
      expect.arrayContaining([expect.stringMatching(/^refreshToken=.*; HttpOnly/i)]),
    );
  });
});
