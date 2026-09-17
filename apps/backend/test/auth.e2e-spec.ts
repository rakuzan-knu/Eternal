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
});
